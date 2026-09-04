import { GeminiService } from "./src/modules/chat/gemini.service.ts"

async function main() {
  try {
    const svc = new GeminiService()
    const out = await svc.generateReply(
      "What is your stack?",
      [],
      JSON.stringify({ profile: { name: "Test", title: "Dev" } }),
      "test-1.0.0"
    )
    console.log("SUCCESS:", out)
  } catch (e) {
    console.error("FAILED:", e)
  }
}
main()
