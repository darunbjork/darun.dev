export interface SiteContentData {
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroBio: string;
  aboutSubtitle: string;
  aboutParagraphs: string[];
  contactBlurb: string;
}

export interface SiteContentResponse extends SiteContentData {
  updatedAt: string | null;
}

export const SITE_CONTENT_DEFAULTS: SiteContentData = {
  heroEyebrow: "Full-Stack AI Engineer · Stockholm",
  heroTitle: "Building production AI systems",
  heroAccent: " end-to-end",
  heroBio:
    "Darun Mustafa — MERN background, strict TypeScript, Fastify, RAG pipelines, and observable backends. Portfolio, chat, and admin tools on one platform.",
  aboutSubtitle: "Full-stack AI engineer · Stockholm · Open to roles",
  aboutParagraphs: [
    "I build production AI systems end-to-end — from vector search pipelines to the auth layer that protects them. Recently shipped **darun.dev**, a portfolio platform with hybrid RAG chat, an admin CMS, and self-maintaining embeddings driven by GitHub webhooks.",
    "Now building **LIA App** — a platform where developers find internships in Sweden, built on the Arbetsförmedlingen API. I care about the boring parts — CSRF, token budgets, idempotent migrations, webhook signature verification — because those are what separate a demo from something that survives contact with production.",
  ],
  contactBlurb:
    "Open to full-stack and AI engineering roles in Stockholm, plus selected contract work. Usually respond within a day.",
};

export const SITE_CONTENT_LIMITS = {
  heroEyebrow: 200,
  heroTitle: 120,
  heroAccent: 80,
  heroBio: 500,
  aboutSubtitle: 200,
  aboutParagraph: 1500,
  aboutParagraphsMin: 1,
  aboutParagraphsMax: 4,
  contactBlurb: 500,
} as const;
