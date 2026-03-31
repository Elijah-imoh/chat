import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSmartReplies(messages: string[]) {
  if (!process.env.GEMINI_API_KEY) return [];
  
  try {
    const context = messages.slice(-5).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following chat context, suggest 3 short, relevant smart replies. Return ONLY a JSON array of strings.
      Context:
      ${context}`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Smart Reply Error:", error);
    return [];
  }
}

export async function summarizeChat(messages: string[]) {
  if (!process.env.GEMINI_API_KEY) return "AI features unavailable.";

  try {
    const context = messages.join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following chat conversation in a concise paragraph:
      ${context}`,
    });

    return response.text || "Could not summarize.";
  } catch (error) {
    console.error("AI Summarization Error:", error);
    return "Error generating summary.";
  }
}

export async function rewriteMessage(text: string, tone: 'formal' | 'casual' | 'friendly') {
  if (!process.env.GEMINI_API_KEY) return text;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following message in a ${tone} tone. Return ONLY the rewritten text.
      Message: ${text}`,
    });

    return response.text || text;
  } catch (error) {
    console.error("AI Rewrite Error:", error);
    return text;
  }
}

export async function askAssistant(question: string, chatHistory: string[]) {
  if (!process.env.GEMINI_API_KEY) return "AI features unavailable.";

  try {
    const context = chatHistory.slice(-10).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a helpful chat assistant. Answer the user's question based on the chat context if relevant.
      Chat Context:
      ${context}
      
      User Question: ${question}`,
    });

    return response.text || "I'm not sure how to help with that.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Error communicating with AI.";
  }
}
