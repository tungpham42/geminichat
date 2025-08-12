import { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!event.body) {
      return { statusCode: 400, body: "Missing request body" };
    }

    const { messages } = JSON.parse(event.body);

    // Filter and map roles for Gemini
    const contents = messages
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }],
      }));

    const result = await ai.models.generateContent({
      model: process.env.GENAI_MODEL || "gemini-2.0-flash-001",
      contents,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: result.text }),
    };
  } catch (err: any) {
    console.error("GenAI Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
};

export { handler };
