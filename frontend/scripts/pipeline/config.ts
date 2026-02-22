import { config } from "dotenv";
import path from "path";
import type { BlogCategory } from "../../src/lib/blog/types";

// Load backend/.env first (DataForSEO credentials), then frontend .env.local (OpenAI, etc.)
// dotenv won't override existing vars, so whichever loads first wins for shared keys
// In CI, secrets are injected as real env vars — dotenv files won't exist and that's fine
try { config({ path: path.join(process.cwd(), "..", "backend", ".env") }); } catch {}
try { config({ path: path.join(process.cwd(), ".env.local") }); } catch {}

export const PIPELINE_CONFIG = {
  openai: {
    model: "gpt-4o" as const,
    maxRetries: 4,
    temperature: 0.7,
  },
  research: {
    brainstormTemperature: 0.3,
    enrichTemperature: 0.2,
    faqTemperature: 0.3,
    factCheckTemperature: 0.1,
    systemMessage:
      "You are a helpful research assistant specializing in corporate distress, bankruptcy, asset disposition, and business intelligence. Provide accurate, well-sourced information with citations. Focus on factual, verifiable information.",
  },
  dataforseo: {
    baseUrl: "https://api.dataforseo.com/v3",
    location: 2840, // United States
    language: "en",
  },
  ideation: {
    ideasPerCategory: 15,
    topIdeasForValidation: 10,
  },
  scoring: {
    maxSearchVolume: 30, // points
    maxKeywordDifficulty: 20, // points (inverted — lower difficulty = more points)
    maxSerpFeatures: 20, // points
    maxRelatedQuestions: 20, // points
    maxKeywordQuality: 10, // points
    minOpportunityScore: 35, // minimum score to auto-generate (0-100)
    warnThreshold: 45, // scores below this get a warning but aren't blocked
  },
  content: {
    minWordCount: 1000,
    maxWordCount: 2500,
    minFaqs: 5,
    minHeadings: 8,
    maxTitleLength: 70,
    descriptionMinLength: 120,
    descriptionMaxLength: 165,
  },
  closureContent: {
    minWordCount: 600,
    maxWordCount: 1500,
    minFaqs: 3,
    minHeadings: 6,
    maxTitleLength: 70,
    descriptionMinLength: 120,
    descriptionMaxLength: 165,
  },
  closureDefaults: {
    category: "liquidation-strategy" as BlogCategory,
    skipHeroGeneration: false,
  },
  author: {
    name: "DispoSight Research",
    role: "Market Intelligence Team",
    bio: "The DispoSight Research team monitors corporate distress signals across WARN Act filings, bankruptcy courts, SEC filings, and global news to surface asset disposition opportunities for deal-driven organizations.",
  },
  heroImage: {
    enabled: false,
    model: "gpt-image-1.5" as const,
    size: "1536x1024" as const, // landscape
    quality: "medium" as const, // "low" ~$0.02, "medium" ~$0.04, "high" ~$0.19
  },
  site: {
    url: "https://disposight.com",
    name: "DispoSight",
  },
} as const;

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY not found. Set it in .env.local or pass via environment."
    );
  }
  return key;
}

export function getDataForSEOCredentials(): { login: string; password: string } {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error(
      "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not found. Set them in .env.local or pass via environment."
    );
  }
  return { login, password };
}
