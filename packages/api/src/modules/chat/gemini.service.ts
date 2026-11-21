import { z } from "zod"
import type { GeminiStructuredOutput } from "@darun/shared-types"
import { AppError } from "../../utils/errors.js"
import { callGemini } from "../../utils/gemini-client.js"
import { MAX_OUTPUT_TOKENS } from "./cost-limits.js"

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
      const result = await callGemini(fullPrompt, {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        responseMimeType: "application/json",
      })
      rawOutput = result.text
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
- NEVER answer questions about competitors or other companies.

TECHNOLOGIES:
- Only claim a technology that is listed in the CONTEXT "stack". Each entry reads
  "Name — repo: evidence | repo: evidence"; the repo URLs are in "repoLinks".
- When asked about a technology, name the repo(s) that prove it, say briefly what
  was built with it (the evidence), and include each repo's URL from "repoLinks".
- NEVER claim a technology that has no "stack" entry, even if it appears elsewhere
  in the context. If asked about one, use guardrails.unknownTechnology.
- "live at <url>" evidence is a running deployment: when asked where something is
  hosted or deployed, give that URL.
- Repos labelled "(in progress)" are in progress: say so, and never describe them or
  their technologies as shipped, live or in production.

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