import { GoogleGenAI } from "@google/genai"
import { z } from "zod"
import { env } from "../../env.js"

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

const MODEL = "gemini-3.6-flash"

const SentimentSchema = z.object({
  score: z.number().min(-1).max(1),
  reason: z.string(),
})

export async function scoreSentiment(
  transcript: string
): Promise<number | null> {
  if (transcript.trim().length === 0) {
    return null
  }

  try {
    const prompt = `Analyze the sentiment of this visitor's messages in a portfolio chat.
Score from -1 (very negative/frustrated) to +1 (very positive/enthusiastic).
Focus ONLY on the visitor's messages, not the AI responses.

TRANSCRIPT:
${transcript}

Respond ONLY with JSON: { "score": 0.0, "reason": "brief explanation" }`

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    })

    const raw = result.text
    if (raw === undefined || raw.length === 0) return null

    const parsed = SentimentSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.score : null
  } catch (err) {
    console.error("sentiment.service failure:", err)
    return null
  }
}