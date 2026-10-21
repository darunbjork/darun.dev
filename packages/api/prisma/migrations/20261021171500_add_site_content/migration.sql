-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroEyebrow" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroAccent" TEXT NOT NULL,
    "heroBio" TEXT NOT NULL,
    "aboutSubtitle" TEXT NOT NULL,
    "aboutParagraphs" TEXT[],
    "contactBlurb" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);
