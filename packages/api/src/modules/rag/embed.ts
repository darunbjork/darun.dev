import { GoogleGenAI } from "@google/genai"
import { env } from "../../env.js"

const MODEL = "gemini-embedding-001"
const EXPECTED_DIM = 768

let cachedClient: GoogleGenAI | null = null

function client(): GoogleGenAI {
  if (env.GEMINI_API_KEY.length === 0) {
    throw new Error("GEMINI_API_KEY is required for embeddings")
  }
  if (cachedClient === null) {
    cachedClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  }
  return cachedClient
}

export async function embedText(text: string): Promise<number[]> {
  const ai = client()

  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text,
    config: {
      outputDimensionality: EXPECTED_DIM,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  })

  const values = response.embeddings?.[0]?.values
  if (values === undefined || values.length !== EXPECTED_DIM) {
    throw new Error(
      `Unexpected embedding size: ${values?.length ?? "undefined"} (expected ${EXPECTED_DIM})`
    )
  }

  // ! gemini-embedding-001 does NOT L2-normalize sub-3072 outputs.
  // Required for cosine similarity to behave correctly.
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0))
  if (norm === 0) throw new Error("Zero-norm embedding returned")
  return values.map((v) => v / norm)
}

export async function embedQuery(text: string): Promise<number[]> {
  const ai = client()

  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text,
    config: {
      outputDimensionality: EXPECTED_DIM,
      taskType: "RETRIEVAL_QUERY",
    },
  })

  const values = response.embeddings?.[0]?.values
  if (values === undefined || values.length !== EXPECTED_DIM) {
    throw new Error(`Unexpected embedding size: ${values?.length ?? "undefined"}`)
  }

  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0))
  if (norm === 0) throw new Error("Zero-norm embedding returned")
  return values.map((v) => v / norm)
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