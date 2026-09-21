import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { AppError } from "../../utils/errors.js"
import { callGemini } from "../../utils/gemini-client.js"

const MAX_JD_CHARS = 10_000

const PitchResponseSchema = z.object({
  blockers: z.array(z.string().max(200)).max(10),
  recommendation: z.enum(["apply", "consider", "skip"]),
  parsed: z.object({
    role: z.string().min(1).max(200),
    company: z.string().max(200).nullable(),
    requiredSkills: z.array(z.string().max(200)).max(30),
    niceToHave: z.array(z.string().max(200)).max(20),
    responsibilities: z.array(z.string().max(500)).max(20),
    yearsRequired: z.number().nullable(),
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
  "You are a career-fit analyst for Darun Mustafa, a full-stack engineer based in Stockholm.",
  "",
  "You produce two categories of output:",
  "",
  "=== INTERNAL (candidate's eyes only — be blunt) ===",
  "Fields: blockers, recommendation, parsed, pitch.fitSummary, pitch.matchedSkills, pitch.gapSkills.",
  "Name every gap. The candidate needs enough information to decide whether to apply.",
  "",
  "=== EXTERNAL (recruiter-facing — forward-looking, no self-sabotage) ===",
  "Fields: pitch.pitchText, pitch.coverLetter.",
  "Never apologize for gaps. Never invent experience. Lead with strengths.",
  "",
  "[CANDIDATE CV]",
  "--- CV START ---",
  cvBlock,
  "--- CV END ---",
  "",
  "[PUBLISHED PROJECTS]",
  projectsBlock || "(none)",
  "",
  "[JOB DESCRIPTION]",
  "--- JD START ---",
  trimmed,
  "--- JD END ---",
  "",
  "=== INTERNAL RULES ===",
  "",
  "1. blockers: hard requirements the candidate CANNOT meet by learning.",
  "   - Native/fluent language requirement (in any language)",
  "   - Work authorization: VAT number, visa, right to work, security clearance",
  "   - Mandatory physical location or residency",
  "   - Empty array if none.",
  "   NOT blockers: a framework the candidate doesn't know (goes in gapSkills);",
  "   years of experience shortfall (note in fitSummary as a soft gap);",
  "   industry domain mismatch (learnable).",
  "",
  "2. recommendation:",
  "   - 'skip': any blocker exists, OR 3+ required skills missing",
  "   - 'consider': 1-2 required skills missing, no blockers",
  "   - 'apply': no blockers, all required skills present",
  "",
  "3. fitSummary (2-3 sentences, internal voice):",
  "   - Start with the recommendation and the one-line reason.",
  "   - Note soft gaps here: years of experience, industry domain, adjacent skills.",
  "   - Example: 'Consider applying. No hard blockers; the candidate matches 6 of 8 required skills. Two years short of the stated experience requirement, but the portfolio shows equivalent depth.'",
  "",
  "4. gapSkills: ONLY skills, tools, or role-relevant experience.",
  "   NEVER include location, language, or work authorization. Those belong in blockers or fitSummary.",
  "",
  "=== EXTERNAL RULES ===",
  "",
  "1. pitchText (under 150 words) and coverLetter (250-400 words) must:",
  "   - Lead with a strength relevant to the JD, not an apology or a gap.",
  "   - Reference one specific detail from the JD (a responsibility, a stated",
  "     problem, or a required tool).",
  "   - Mirror the JD's own vocabulary where the CV supports it.",
  "   - Name specific tools from the CV that match the JD (Redux Toolkit, React",
  "     Native, Fastify, etc.).",
  "",
  "2. pitchText and coverLetter must NOT:",
  "   - Say 'I don't have X' or 'I lack X'.",
  "   - Lead with a gap ('Although I lack...', 'While I don't have...').",
  "   - Claim ramp-up on a non-adjacent skill. Adjacency means same paradigm:",
  "     OK: React Native → Ionic, PostgreSQL → MySQL, Redux → MobX, Node → Express.",
  "     NOT OK: Node.js → PHP, React → Angular.",
  "   - Invent experience that is not in the CV.",
  "",
  "3. If a soft gap is worth addressing (time zone, language level, years",
  "   of experience), address it in ONE sentence at the end of the letter,",
  "   framed as context, never as an apology.",
  "",
  "=== OUTPUT FORMAT ===",
  "Respond ONLY with this exact JSON structure. No markdown. No commentary.",
  "{",
  '  "blockers": ["string"],',
  '  "recommendation": "apply | consider | skip",',
  '  "parsed": {',
  '    "role": "string",',
  '    "company": "string or null",',
  '    "requiredSkills": ["string"],',
  '    "niceToHave": ["string"],',
  '    "responsibilities": ["string"],',
  '    "yearsRequired": "number or null"',
  "  },",
  '  "pitch": {',
  '    "fitSummary": "string",',
  '    "matchedSkills": ["string"],',
  '    "gapSkills": ["string"],',
  '    "pitchText": "string",',
  '    "coverLetter": "string"',
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
