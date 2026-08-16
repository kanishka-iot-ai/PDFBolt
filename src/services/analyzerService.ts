import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { aiService } from './aiService';
import { generatePptxFromStructuredSlides, StructuredSlide } from './pptService';
import { pdfToWord, pdfToExcel } from './conversionService';

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface DocumentAnalysis {
    fileName: string;
    fileSizeBytes: number;
    pageCount: number;
    wordCount: number;
    characterCount: number;
    estimatedReadTimeMinutes: number;
    tableCount: number;
    imageCount: number;
    topics: string[];
    executiveSummary: string;
    keyFindings: string[];
    suggestedQuestions: string[];
    fullText: string;
    pageSummaries: { pageNumber: number; wordCount: number; preview: string }[];
}

/**
 * Heuristic topic extraction and frequency analysis
 */
function extractTopTopics(text: string): string[] {
    const stopWords = new Set([
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'more', 'will', 'your', 'about',
        'there', 'their', 'which', 'would', 'these', 'other', 'into', 'first', 'could', 'after', 'than',
        'then', 'them', 'been', 'when', 'also', 'over', 'page', 'document', 'report', 'section', 'using',
        'between', 'under', 'through', 'where', 'should', 'without', 'because', 'each', 'such'
    ]);

    const words = text.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || [];
    const frequencyMap: Record<string, number> = {};

    words.forEach(word => {
        if (!stopWords.has(word)) {
            frequencyMap[word] = (frequencyMap[word] || 0) + 1;
        }
    });

    return Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

/**
 * Generates extractive bullet points when AI API is unavailable
 */
function generateHeuristicKeyFindings(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const findings = sentences
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 50 && s.length < 200)
        .filter(s => !s.toLowerCase().startsWith('table of') && !s.toLowerCase().startsWith('copyright'))
        .slice(0, 5);

    if (findings.length === 0) {
        return [
            "Document contains structured text data ready for conversion.",
            "Visual assets and table rows are preserved for multi-format export."
        ];
    }
    return findings;
}

/**
 * Performs deep client-side structural analysis of any PDF
 */
export async function analyzePdfDocument(file: File): Promise<DocumentAnalysis> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    let totalWords = 0;
    let totalImages = 0;
    let estimatedTables = 0;
    const pageSummaries: { pageNumber: number; wordCount: number; preview: string }[] = [];

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const operatorList = await page.getOperatorList();

            // Count paint image operators (paintImageXObject is 85 in PDF.js, paintInlineImageXObject is 86)
            const OPS = (pdfjsLib as any).OPS || { paintImageXObject: 85, paintInlineImageXObject: 86 };
            const imageOps = operatorList.fnArray.filter(fn => fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject);
            totalImages += imageOps.length;

            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            const words = pageText.split(/\s+/).filter(Boolean);
            totalWords += words.length;
            fullText += pageText + "\n\n";

            // Table detection heuristic: look for vertical alignment patterns
            const items = textContent.items as any[];
            if (items.length > 15) {
                const xCoords = new Set(items.map(it => Math.round(it.transform[4])));
                if (xCoords.size >= 4 && items.length > xCoords.size * 3) {
                    estimatedTables += 1;
                }
            }

            pageSummaries.push({
                pageNumber: i,
                wordCount: words.length,
                preview: pageText.substring(0, 180) + (pageText.length > 180 ? '...' : '')
            });
        }
    } finally {
        pdf.destroy();
    }

    const topics = extractTopTopics(fullText);
    const readTime = Math.max(1, Math.ceil(totalWords / 200));

    // Try AI Summary if API is configured, else heuristic fallback
    let executiveSummary = "";
    let keyFindings: string[] = [];

    try {
        const prompt = `Analyze this document text and provide:
1. A 3-sentence executive summary.
2. 4 bullet key findings.
Document text:
${fullText.substring(0, 6000)}`;

        const aiResponse = await aiService.getQuickInsight(prompt);
        if (aiResponse && !aiResponse.includes("disabled")) {
            const lines = aiResponse.split('\n').filter(l => l.trim());
            executiveSummary = lines.slice(0, 3).join(' ');
            keyFindings = lines.filter(l => l.startsWith('-') || l.startsWith('•') || l.match(/^\d+\./))
                .map(l => l.replace(/^[-•\d.]\s*/, '').trim())
                .slice(0, 5);
        }
    } catch {
        // Fallback to local heuristic
    }

    if (!executiveSummary) {
        executiveSummary = pageSummaries[0]?.preview
            ? `This ${pdf.numPages}-page document covers ${topics.slice(0, 3).join(', ')}. Key contents: ${pageSummaries[0].preview}`
            : `Comprehensive document consisting of ${pdf.numPages} pages and ${totalWords.toLocaleString()} words across ${topics.length} core subject areas.`;
    }

    if (keyFindings.length === 0) {
        keyFindings = generateHeuristicKeyFindings(fullText);
    }

    const suggestedQuestions = [
        `What are the main takeaways regarding ${topics[0] || 'the key topics'}?`,
        `Can you summarize the financial / numerical data in this document?`,
        `What actions or conclusions are recommended in the final sections?`,
        `Create a bulleted executive briefing based on this report.`
    ];

    return {
        fileName: file.name,
        fileSizeBytes: file.size,
        pageCount: pdf.numPages,
        wordCount: totalWords,
        characterCount: fullText.length,
        estimatedReadTimeMinutes: readTime,
        tableCount: estimatedTables,
        imageCount: totalImages,
        topics,
        executiveSummary,
        keyFindings,
        suggestedQuestions,
        fullText,
        pageSummaries
    };
}

/**
 * Builds an 8 to 10-slide Presentation Deck (.pptx) from analyzed document data
 */
export async function buildPresentationFromAnalysis(analysis: DocumentAnalysis): Promise<Blob> {
    const slides: StructuredSlide[] = [
        {
            title: analysis.fileName.replace(/\.pdf$/i, ''),
            subtitle: `Executive Briefing & Strategic Overview • ${analysis.pageCount} Pages • ${analysis.wordCount.toLocaleString()} Words`,
            bullets: []
        },
        {
            title: "Executive Summary",
            bullets: [
                analysis.executiveSummary,
                `Primary thematic focus areas: ${analysis.topics.join(', ')}.`,
                `Total document scope: ${analysis.pageCount} pages, ~${analysis.estimatedReadTimeMinutes} min reading time.`
            ]
        },
        {
            title: "Key Strategic Findings",
            bullets: analysis.keyFindings.length > 0 ? analysis.keyFindings : [
                "Key data points and findings extracted from primary sections.",
                "Quantitative figures and tables preserved in analysis.",
                "Review subsequent slides for topical breakdown."
            ]
        }
    ];

    // Create a slide for each main topic
    analysis.topics.slice(0, 4).forEach((topic, idx) => {
        const relatedPage = analysis.pageSummaries.find(p => p.preview.toLowerCase().includes(topic.toLowerCase()));
        slides.push({
            title: `Topic ${idx + 1}: ${topic}`,
            bullets: [
                `Dedicated section analysis regarding ${topic}.`,
                relatedPage ? `Context: "${relatedPage.preview.substring(0, 120)}..."` : `In-depth structural breakdown of ${topic} metrics.`,
                `Actionable recommendations derived from page references.`
            ]
        });
    });

    // Conclusion Slide
    slides.push({
        title: "Conclusions & Next Steps",
        bullets: [
            "Review extracted tabular spreadsheets for deeper numeric reconciliation.",
            "Share executive briefing with stakeholders.",
            "Generated automatically via PDFBolt 100% Client-Side Intelligence."
        ]
    });

    return generatePptxFromStructuredSlides(slides, analysis.fileName);
}

/**
 * Answers natural language questions about the analyzed document
 */
export async function askDocumentQuestion(
    question: string,
    analysis: DocumentAnalysis
): Promise<string> {
    try {
        const prompt = `Context document (${analysis.fileName}, ${analysis.pageCount} pages):
"""
${analysis.fullText.substring(0, 8000)}
"""

User Question: "${question}"

Provide a concise, direct, professional answer based ONLY on the text above. If the answer is not mentioned, state that politely.`;

        const response = await aiService.getQuickInsight(prompt);
        if (response && !response.includes("disabled")) {
            return response;
        }
    } catch {
        // Fallback
    }

    // Heuristic keyword match answer
    const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchingSentences = analysis.fullText.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => qWords.some(qw => s.toLowerCase().includes(qw)))
        .slice(0, 3);

    if (matchingSentences.length > 0) {
        return matchingSentences.join('. ') + '.';
    }

    return `Based on the document text, "${question}" relates to topics including ${analysis.topics.join(', ')}. For deeper analysis, explore the Key Findings section or export to Word/PPT format.`;
}
