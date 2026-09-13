import { GoogleGenerativeAI } from "@google/generative-ai"
import { env } from "../../env.js"

const MODEL = "text-embedding-004"
const EXPECTED_DIM = 768

let cachedClient: GoogleGenerativeAI | null = null

function client(): GoogleGenerativeAI {
  if (env.GEMINI_API_KEY.length === 0) {
    throw new Error("GEMINI_API_KEY is required for embeddings")
  }
  if (cachedClient === null) {
    cachedClient = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  }
  return cachedClient
}

export async function embedText(text: string): Promise<number[]> {
  const genAI = client()
  const model = genAI.getGenerativeModel({ model: MODEL })

  // ! v0.24.x API — explicit Content object form
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
  })

  const values = result.embedding.values
  if (values.length !== EXPECTED_DIM) {
    throw new Error(
      `Unexpected embedding size: ${values.length} (expected ${EXPECTED_DIM})`
    )
  }
  return values
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (const t of texts) {
    out.push(await embedText(t))
    await new Promise((r) => setTimeout(r, 50))
  }
  return out
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`
}