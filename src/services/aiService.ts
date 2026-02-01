
import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";

export class AIService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not found in environment variables. AI features will be disabled.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async *streamChat(message: string, history: Content[]) {
    const chat = this.ai.chats.create({
      model: 'gemini-1.5-pro',
      history: history,
      config: {
        systemInstruction: "You are the PDFBolt Assistant. You help users manage, edit, and understand PDF documents. You are polite, professional, and aware that PDFBolt is a 100% private, browser-based toolkit. You do not have access to their actual file bytes unless they paste text, but you can guide them on how to use Merge, Split, Compress, and QR tools effectively.",
      }
    });

    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      yield c.text;
    }
  }

  async getQuickInsight(prompt: string) {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a speed-focused document analyst. Provide very concise, bulleted insights.",
      }
    });
    return response.text;
  }
}

export const aiService = new AIService();
