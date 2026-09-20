import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { AppError } from "../../utils/errors.js"
import { callGemini } from "../../utils/gemini-client.js"

const MAX_JD_CHARS = 10_000

const PitchResponseSchema = z.object({
  parsed: z.object({
    role: z.string().min(1).max(200),
    company: z.string().max(200).nullable(),
    requiredSkills: z.array(z.string().max(200)).max(30),
    niceToHave: z.array(z.string().max(200)).max(20),
    responsibilities: z.array(z.string().max(500)).max(20),
  }),
  pitch: z.object({
    fitSummary: z.string().min(1).max(1500),
    matchedSkills: z.array(z.string().max(200)).max(30),
    gapSkills: z.array(z.string().max(200)).max(20),
    pitchText: z.string().min(1).max(2500),
    coverLetter: z.string().min(1).max(4000),
  }),
})

export type PitchResponse = z.infer<typeof PitchResponseSchema>

export class PitchService {
  constructor(private readonly fastify: FastifyInstance) {}

  async generate(jdText: string): Promise<PitchResponse> {
    const trimmed = jdText.trim()
    if (trimmed.length === 0) {
      throw new AppError("Job description is required", 400, "VALIDATION_ERROR")
    }
    if (trimmed.length > MAX_JD_CHARS) {
      throw new AppError(
        `Job description exceeds ${MAX_JD_CHARS} characters`,
        400,
        "VALIDATION_ERROR",
      )
    }

    const cv = await this.fastify.prisma.cvDocument.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    })

    const projects = await this.fastify.prisma.project.findMany({
      where: { published: true },
      select: { title: true, techStack: true, description: true },
    })

    const cvBlock = cv !== null ? cv.content : "(no active CV)"
    const projectsBlock = projects
      .map((p) => {
        const stack = Array.isArray(p.techStack)
          ? p.techStack.filter((x): x is string => typeof x === "string").join(", ")
          : ""
        return `- ${p.title}: ${stack}`
      })
      .join("\n")

    const prompt = [
      "You are a career-fit analyst for Darun Mustafa, a full-stack AI engineer based in Stockholm.",
      "",
      "CANDIDATE CV:",
      "--- CV START ---",
      cvBlock,
      "--- CV END ---",
      "",
      "CANDIDATE PUBLISHED PROJECTS (tech stacks):",
      projectsBlock || "(none)",
      "",
      "JOB DESCRIPTION:",
      "--- JD START ---",
      trimmed,
      "--- JD END ---",
      "",
      "Important: place any geographic, language, or work-authorization considerations in fitSummary only. gapSkills must contain only skills, tools, or role-relevant experience — never personal circumstances.",
      "",
      "Analyse the fit. Be honest about gaps. Do not invent skills the candidate does not have.",
      "",
      "Respond ONLY with this exact JSON structure. No markdown, no commentary.",
      "{",
      '  "parsed": {',
      '    "role": "string",',
      '    "company": "string or null",',
      '    "requiredSkills": ["string"],',
      '    "niceToHave": ["string"],',
      '    "responsibilities": ["string"]',
      "  },",
      '  "pitch": {',
      '    "fitSummary": "2-3 sentences on why the candidate fits",',
      '    "matchedSkills": ["skills the candidate has that the job needs"],',
      '    "gapSkills": ["skills or role-relevant experience the candidate lacks — do NOT include location, time zone, right-to-work status, language, or any non-skill attribute"],',
      '    "pitchText": "a short, direct pitch paragraph (under 200 words)",',
      '    "coverLetter": "a full cover letter (under 400 words)"',
      "  }",
      "}",
    ].join("\n")

    let rawOutput: string
    try {
      const result = await callGemini(prompt, {
        maxOutputTokens: 3000,
        temperature: 0.4,
        responseMimeType: "application/json",
      })
      rawOutput = result.text
      this.fastify.log.info(
        { model: result.model, attempts: result.attempts },
        "pitch gemini ok",
      )
    } catch (err) {
      this.fastify.log.error({ err }, "pitch gemini call failed")
      throw new AppError("Pitch service unavailable", 503, "PITCH_UNAVAILABLE")
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawOutput)
    } catch {
      this.fastify.log.error({ rawOutput }, "pitch json parse failed")
      throw new AppError("Pitch response format error", 500, "PITCH_PARSE_ERROR")
    }

    const validated = PitchResponseSchema.safeParse(parsedJson)
    if (!validated.success) {
      this.fastify.log.error(
        { issues: validated.error.issues },
        "pitch schema validation failed",
      )
      throw new AppError(
        "Pitch response validation error",
        500,
        "PITCH_VALIDATION_ERROR",
      )
    }

    return validated.data
  }
}
