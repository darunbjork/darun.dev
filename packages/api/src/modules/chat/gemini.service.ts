import { GoogleGenAI } from "@google/genai"
import { z } from "zod"
import { env } from "../../env.js"
import type { GeminiStructuredOutput } from "@darun/shared-types"
import { AppError } from "../../utils/errors.js"
import { MAX_OUTPUT_TOKENS } from "./cost-limits.js"

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

const MODEL = "gemini-3.6-flash"

const GeminiOutputSchema = z.object({
  reply: z.string().min(1).max(4000),
  userType: z.enum(["Unknown", "Recruiter", "Developer", "Client", "Other"]),
  notes: z.object({
    summary: z.string().nullable(),
    nextSteps: z.array(z.string()).nullable(),
    painPoints: z.array(z.string()).nullable(),
  }),
})

export class GeminiService {
  async generateReply(
    userMessage: string,
    history: Array<{ role: string; content: string }>,
    contextJson: string,
    contextVersion: string
  ): Promise<GeminiStructuredOutput> {
    const systemPrompt = buildSystemPrompt(contextJson)

    const historyText = history
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")

    const fullPrompt = [
      systemPrompt,
      historyText.length > 0 ? `\nConversation history:\n${historyText}` : "",
      `\nUser message: ${userMessage}`,
    ].join("\n")

    let rawOutput: string

    try {
      const result = await ai.models.generateContent({
        model: MODEL,
        contents: fullPrompt,
        config: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      })
      rawOutput = result.text ?? ""
    } catch (error) {
      console.error("Gemini API error:", error)
      throw new AppError(
        "AI service temporarily unavailable",
        503,
        "AI_UNAVAILABLE"
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawOutput)
    } catch {
      console.error(
        `Gemini JSON parse failure (context: ${contextVersion}):`,
        rawOutput
      )

      const trimmed = rawOutput.trimEnd()
      if (trimmed.length > 0 && !trimmed.endsWith("}")) {
        return {
          reply:
            "That answer got cut off before I could finish it. Try asking about a specific project, or narrow the question so I can give a tighter response.",
          userType: "Unknown",
          notes: { summary: null, nextSteps: null, painPoints: null },
        }
      }

      throw new AppError("AI response format error", 500, "AI_PARSE_ERROR")
    }

    const validated = GeminiOutputSchema.safeParse(parsed)
    if (!validated.success) {
      console.error(
        `Gemini schema validation failure (context: ${contextVersion}):`,
        validated.error.flatten()
      )
      throw new AppError(
        "AI response validation error",
        500,
        "AI_VALIDATION_ERROR"
      )
    }

    return validated.data
  }
}

function buildSystemPrompt(contextJson: string): string {
  return `You are an AI assistant on Darun Mustafa's portfolio site (darun.dev).

IDENTITY: You are a stateless renderer. You have zero independent knowledge of Darun Mustafa.
Your entire knowledge comes from the CONTEXT section below. Do not use your training data.
Do not recall previous conversations unless they appear in the provided history.

INSTRUCTION: Answer ONLY from the context. If the answer is not explicitly in the context, respond exactly:
"I don't have that detail handy — I'd be happy to discuss it further in an interview."

PROHIBITIONS:
- NEVER invent facts, skills, projects, or experience.
- NEVER speculate about salary, location preferences, or timeline.
- NEVER mention technologies not listed in the context.
- NEVER answer questions about competitors or other companies.

--- CONTEXT START ---
${contextJson}
--- CONTEXT END ---

Tone: Direct, technical, confident. No marketing language.
Keep replies under 400 words. If the answer is long, prefer a compact bulleted summary over prose.

Respond ONLY with this exact JSON structure. No markdown. No extra text:
{
  "reply": "string",
  "userType": "Unknown" | "Recruiter" | "Developer" | "Client" | "Other",
  "notes": {
    "summary": "string or null",
    "nextSteps": ["string"] or null,
    "painPoints": ["string"] or null
  }
}`
}