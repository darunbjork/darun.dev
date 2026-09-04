import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"
import { env } from "../../env.js"

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

const model = genAI.getGenerativeModel({
  model: "gemini-3.6-flash",
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  },
})

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

    const result = await model.generateContent(prompt)
    const raw = result.response.text()
    const parsed = SentimentSchema.safeParse(JSON.parse(raw))

    return parsed.success ? parsed.data.score : null
  } catch {
    return null
  }
}