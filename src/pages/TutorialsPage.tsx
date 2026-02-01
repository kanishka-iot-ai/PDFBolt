
import React from 'react';
import { BookOpen, Merge, Scissors, Minimize2, Shield, Layers } from 'lucide-react';

const TutorialSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    steps: string[];
    darkMode: boolean
}> = ({ title, icon, steps, darkMode }) => (
    <div className={`p-8 rounded-[2.5rem] border mb-8 transition-all hover:scale-[1.01] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl text-yellow-600 dark:text-yellow-400">
                {icon}
            </div>
            <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        </div>
        <div className="space-y-4">
            {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-sm text-slate-500">
                        {i + 1}
                    </div>
                    <p className={`pt-1 font-medium leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{step}</p>
                </div>
            ))}
        </div>
    </div>
);

const TutorialsPage: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
    return (
        <div className="max-w-4xl mx-auto px-6 py-24 animate-fadeIn">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-black text-[10px] uppercase tracking-widest mb-6">
                    <BookOpen size={14} /> Learning Center
                </div>
                <h1 className={`text-6xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    How to Use <span className="text-yellow-500">PDFBolt</span>
                </h1>
                <p className={`text-xl font-medium max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Master your documents in seconds. Follow these simple guides to get the most out of our tools.
                </p>
            </div>

            <TutorialSection
                darkMode={darkMode}
                title="Merge Multiple PDFs"
                icon={<Merge size={24} />}
                steps={[
                    "Click on 'Merge' in the navigation bar or home page.",
                    "Upload two or more PDF files from your computer.",
                    "Drag and drop the files to reorder them if needed.",
                    "Click the 'Merge Files' button to process the document.",
                    "Download your single, combined PDF file."
                ]}
            />

            <TutorialSection
                darkMode={darkMode}
                title="Split PDF Pages"
                icon={<Scissors size={24} />}
                steps={[
                    "Navigate to the 'Split' tool.",
                    "Upload the PDF you want to separate.",
                    "Enter the page numbers you want to extract (e.g., '1-5' or '2, 4, 9').",
                    "Click 'Process Split' to extract your pages.",
                    "Download the resulting PDF file containing only your selected pages."
                ]}
            />

            <TutorialSection
                darkMode={darkMode}
                title="Compress PDF Size"
                icon={<Minimize2 size={24} />}
                steps={[
                    "Select the 'Compress' tool.",
                    "Upload your large PDF file.",
                    "Choose a compression level: 'Pro' (Low), 'Smart' (Recommended), or 'Lite' (High).",
                    "Wait for the local processing to optimize images and assets.",
                    "Download the smaller, optimized PDF file."
                ]}
            />

            <TutorialSection
                darkMode={darkMode}
                title="Convert Images to PDF"
                icon={<Layers size={24} />}
                steps={[
                    "Go to 'JPG to PDF' in the tools menu.",
                    "Select multiple image files (JPG, PNG) from your device.",
                    "Reorder the images as you want them to appear in the document.",
                    "Click 'Process' to generate your PDF.",
                    "Your images are now a single, paginated PDF document."
                ]}
            />

            <TutorialSection
                darkMode={darkMode}
                title="Secure Your Documents"
                icon={<Shield size={24} />}
                steps={[
                    "Choose the 'Protect PDF' tool.",
                    "Upload your confidential PDF file.",
                    "Enter a strong password to encrypt the file.",
                    "Click 'Protect' to apply 256-bit encryption.",
                    "Download the file. It can now only be opened with the password."
                ]}
            />

        </div>
    );
};

export default TutorialsPage;
