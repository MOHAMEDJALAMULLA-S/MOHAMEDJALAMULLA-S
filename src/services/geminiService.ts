import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType,
              },
            },
            {
              text: "Transcribe the following audio accurately. Provide only the transcription text without any additional comments.",
            },
          ],
        },
      ],
    });

    return response.text || "No transcription available.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}
