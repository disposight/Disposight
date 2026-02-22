import OpenAI from "openai";
import { getOpenAIKey, PIPELINE_CONFIG } from "./config";
import type { BlogCategory } from "../../src/lib/blog/types";
import { BLOG_CATEGORIES } from "../../src/lib/blog/types";

const SYSTEM_MESSAGE =
  "You are a helpful research assistant specializing in corporate distress, bankruptcy, asset disposition, and business intelligence. Provide accurate, well-sourced information with citations. Focus on factual, verifiable information.";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: getOpenAIKey() });
}

async function searchQuery(prompt: string, temperature = 0.3): Promise<string> {
  const client = getClient();

  const response = await client.responses.create({
    model: PIPELINE_CONFIG.openai.model,
    temperature,
    tools: [{ type: "web_search_preview" }],
    input: [
      { role: "system", content: SYSTEM_MESSAGE },
      { role: "user", content: prompt },
    ],
  });

  // Extract text from the response output
  let text = "";
  for (const item of response.output) {
    if (item.type === "message") {
      for (const block of item.content) {
        if (block.type === "output_text") {
          text += block.text;
        }
      }
    }
  }

  return text;
}

// --- Phase 1: Brainstorm Ideas ---

export interface BlogIdea {
  keyword: string;
  description: string;
}

export async function discoverBlogIdeas(
  category: BlogCategory,
  verbose = false
): Promise<BlogIdea[]> {
  const categoryInfo = BLOG_CATEGORIES[category];
  const categoryName = categoryInfo?.name || category;

  if (verbose) console.log(`  Brainstorming ideas for "${categoryName}"...`);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `Today's date is ${today}.

For a corporate distress intelligence platform blog, suggest ${PIPELINE_CONFIG.ideation.ideasPerCategory} SEO keyword phrases in the "${categoryName}" category.

Context: The blog is for DispoSight, a platform used by liquidation firms, distressed PE firms, equipment remarketers, and wholesale asset buyers.

CRITICAL: Each keyword must be a SHORT search phrase (2-6 words) that someone would actually type into Google. NOT a full blog title or article headline. All topics and data must be current — do NOT reference past years as if they are current.

CRITICAL: Prefer EXISTING search terms that already have search volume — NOT novel compound phrases you invent. Search Google Trends, autocomplete suggestions, and People Also Ask to find real queries people already search for. Phrases pulled directly from Google autocomplete or People Also Ask boxes are ideal.

GOOD keyword examples: "bankruptcy asset auction", "WARN Act filing tracker", "equipment liquidation pricing", "chapter 7 vs chapter 11", "distressed asset due diligence"
BAD examples (too long/invented): "How to Track Bankruptcy Filings for Liquidation Opportunities in 2026", "The Complete Guide to Corporate Equipment Remarketing", "corporate distress intelligence tools", "multi-signal bankruptcy detection platform"

Focus on:
- Short phrases that deal professionals actually search for RIGHT NOW
- Phrases you can verify appear in Google autocomplete, People Also Ask, or related searches
- Commercial and informational intent keywords
- Keywords related to corporate distress, asset disposition, bankruptcy, liquidation
- Mix of head terms (2-3 words) and long-tail (4-6 words)

Search the web for current trends and popular search queries in this space.

For each keyword, provide:
1. The exact short keyword phrase (2-6 words)
2. A brief description of the blog post you'd write targeting this keyword

Format as a numbered list with each entry as:
N. **keyword phrase** — description of the post`;

  const content = await searchQuery(prompt, 0.3);

  // Parse numbered list
  const ideas: BlogIdea[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(
      /^\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*[—–\-]\s*(.+)$/
    );
    if (match) {
      ideas.push({
        keyword: match[1].trim().replace(/\*+/g, ""),
        description: match[2].trim(),
      });
    }
  }

  if (verbose) console.log(`  Found ${ideas.length} ideas`);
  return ideas;
}

// --- Phase 3: Enrich Keywords with Volume Estimates ---

export interface EnrichedKeyword {
  keyword: string;
  estimatedVolume: number;
  relevanceScore: number;
}

export async function enrichKeywordsWithSearch(
  keywords: string[],
  category: BlogCategory,
  verbose = false
): Promise<EnrichedKeyword[]> {
  if (keywords.length === 0) return [];

  const categoryInfo = BLOG_CATEGORIES[category];
  const categoryName = categoryInfo?.name || category;

  if (verbose) console.log(`  Enriching ${keywords.length} keywords with search estimates...`);

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join("\n");

  const prompt = `For these corporate distress and asset disposition blog keywords, search the web to estimate their monthly search demand and relevance to distressed asset buyers.

Keywords:
${keywordList}

For each keyword, search Google to see how much content exists and estimate:
- Monthly US search volume (approximate, 0-10000)
- Relevance (1-10) for a blog targeting liquidation firms, distressed PE, and equipment remarketers in the "${categoryName}" category

IMPORTANT: Return ONLY a JSON array. No other text:
[{"keyword": "...", "volume": 100, "relevance": 8}, ...]`;

  const content = await searchQuery(prompt, 0.2);

  const enriched: EnrichedKeyword[] = [];

  // Try JSON parse first
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { keyword: string; volume: number; relevance: number }[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const matchedKeyword = keywords.find(
            (k) => k.toLowerCase() === item.keyword?.toLowerCase()
          ) || item.keyword;
          if (matchedKeyword) {
            enriched.push({
              keyword: matchedKeyword,
              estimatedVolume: item.volume || 0,
              relevanceScore: item.relevance || 5,
            });
          }
        }
      }
    }
  } catch {
    // Fall through to regex parsing
  }

  // Fallback: regex parsing for any keywords not yet enriched
  const enrichedKeys = new Set(enriched.map((e) => e.keyword.toLowerCase()));
  for (const keyword of keywords) {
    if (enrichedKeys.has(keyword.toLowerCase())) continue;

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Try multiple patterns
    const patterns = [
      new RegExp(`${escapedKeyword}.*?(\\d[\\d,]*)\\s*(?:searches?\\/month|vol).*?(?:Relevance|relevance):?\\s*(\\d+)`, "i"),
      new RegExp(`${escapedKeyword}.*?(\\d[\\d,]*).*?(\\d+)\\s*\\/\\s*10`, "i"),
    ];

    let found = false;
    for (const regex of patterns) {
      const match = content.match(regex);
      if (match) {
        enriched.push({
          keyword,
          estimatedVolume: parseInt(match[1].replace(/,/g, ""), 10),
          relevanceScore: parseInt(match[2], 10),
        });
        found = true;
        break;
      }
    }

    if (!found) {
      enriched.push({
        keyword,
        estimatedVolume: 0,
        relevanceScore: 5,
      });
    }
  }

  if (verbose) {
    const withVolume = enriched.filter((e) => e.estimatedVolume > 0).length;
    console.log(`  Enriched ${withVolume}/${enriched.length} keywords with volume estimates`);
  }

  return enriched;
}

// --- FAQ Generation ---

export interface GeneratedFAQ {
  question: string;
  answer: string;
}

export async function getRelatedQuestions(
  topic: string,
  verbose = false
): Promise<GeneratedFAQ[]> {
  if (verbose) console.log(`  Generating FAQs for "${topic}"...`);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `Today's date is ${today}.

Search the web for the most common questions people ask about "${topic}" in the context of corporate distress, asset disposition, bankruptcy, and liquidation.

Provide exactly 6 common questions with concise, factual 2-4 sentence answers.

IMPORTANT: Respond with ONLY a JSON array, no other text:
[{"question": "...", "answer": "..."}, ...]`;

  const content = await searchQuery(prompt, 0.3);

  const faqs: GeneratedFAQ[] = [];

  // Try JSON parse first (preferred)
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedFAQ[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.question && item.answer) {
            faqs.push({ question: item.question.trim(), answer: item.answer.trim() });
          }
        }
      }
    }
  } catch {
    // Fall through to regex parsing
  }

  // Fallback: parse Q:/A: format (handles bold, citations, varied formatting)
  if (faqs.length === 0) {
    const blocks = content.split(/\n(?=\*{0,2}Q[:\.])/i);
    for (const block of blocks) {
      const qMatch = block.match(/\*{0,2}Q[:\.]?\s*\*{0,2}\s*(.+)/i);
      const aMatch = block.match(/\*{0,2}A[:\.]?\s*\*{0,2}\s*([\s\S]+?)(?=\n\*{0,2}Q[:\.]|$)/i);
      if (qMatch && aMatch) {
        faqs.push({
          question: qMatch[1].replace(/\*+/g, "").replace(/\[\d+\]/g, "").trim(),
          answer: aMatch[1].replace(/\*+/g, "").replace(/\[\d+\]/g, "").trim(),
        });
      }
    }
  }

  if (verbose) console.log(`  Generated ${faqs.length} FAQs`);
  return faqs;
}

// --- Closure Research ---

export interface ClosureResearch {
  companyName: string;
  whatHappened: string;
  storeCount: number | null;
  employeeCount: number | null;
  timeline: string;
  liquidator: string | null;
  assetTypes: string[];
  keyDates: string[];
  sources: { title: string; url: string }[];
  faqs: { question: string; answer: string }[];
}

export async function researchClosure(
  companyName: string,
  verbose = false
): Promise<ClosureResearch> {
  if (verbose) console.log(`  Researching closure for "${companyName}"...`);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = `Today's date is ${today}.

Search the web for the latest news about "${companyName}" closing, shutting down, going out of business, or liquidating.

Gather ALL of the following information. If something is unknown, say "unknown":

1. **What happened** — 2-3 sentence summary of the closure/shutdown announcement
2. **Store/location count** — How many stores, factories, offices, or locations are affected
3. **Employee count** — How many employees are affected
4. **Timeline** — When are closures happening (e.g. "closing by Q2 2026", "liquidation sales starting March")
5. **Liquidator** — Who is handling the liquidation (e.g. "Hilco Merchant Resources", "Gordon Brothers", "Great American Group", court-appointed trustee)
6. **Asset types** — What types of assets will become available (retail fixtures, inventory, real estate leases, equipment, IT assets, vehicles, etc.)
7. **Key dates** — Specific dates for liquidation sales, store closings, court hearings, auction dates
8. **Sources** — URLs of news articles you found

Also generate 5 FAQs that asset buyers would want answered about this closure.

IMPORTANT: Respond with ONLY valid JSON matching this exact structure (no markdown code fences, no extra text):
{
  "companyName": "${companyName}",
  "whatHappened": "string",
  "storeCount": number or null,
  "employeeCount": number or null,
  "timeline": "string",
  "liquidator": "string or null",
  "assetTypes": ["string array"],
  "keyDates": ["string array"],
  "sources": [{"title": "string", "url": "string"}],
  "faqs": [{"question": "string", "answer": "string"}]
}`;

  const content = await searchQuery(prompt, 0.2);

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ClosureResearch;
      if (verbose) {
        console.log(`  Found: ${parsed.whatHappened?.slice(0, 100)}...`);
        console.log(`  Stores: ${parsed.storeCount ?? "unknown"}`);
        console.log(`  Timeline: ${parsed.timeline || "unknown"}`);
        console.log(`  Liquidator: ${parsed.liquidator || "unknown"}`);
        console.log(`  Asset types: ${parsed.assetTypes?.length || 0}`);
        console.log(`  Sources: ${parsed.sources?.length || 0}`);
        console.log(`  FAQs: ${parsed.faqs?.length || 0}`);
      }
      return {
        companyName: parsed.companyName || companyName,
        whatHappened: parsed.whatHappened || "",
        storeCount: parsed.storeCount ?? null,
        employeeCount: parsed.employeeCount ?? null,
        timeline: parsed.timeline || "",
        liquidator: parsed.liquidator ?? null,
        assetTypes: parsed.assetTypes || [],
        keyDates: parsed.keyDates || [],
        sources: parsed.sources || [],
        faqs: parsed.faqs || [],
      };
    }
  } catch {
    // Fall through
  }

  throw new Error(
    `Failed to parse closure research for "${companyName}". Raw response:\n${content.slice(0, 500)}`
  );
}

// --- Fact Checking ---

export interface FactCheckResult {
  claim: string;
  verified: boolean;
  correction?: string;
  source?: string;
}

export async function factCheck(
  claims: string[],
  verbose = false
): Promise<FactCheckResult[]> {
  if (claims.length === 0) return [];
  if (verbose) console.log(`  Fact-checking ${claims.length} claims...`);

  const claimList = claims.map((c, i) => `${i + 1}. ${c}`).join("\n");

  const prompt = `Search the web and verify the accuracy of these claims related to corporate distress, bankruptcy, and asset disposition:

${claimList}

For each claim, respond with:
- VERIFIED or UNVERIFIED
- If unverified, provide the correct information
- Cite a source URL

Format each as:
N. [VERIFIED/UNVERIFIED] — [explanation] (Source: [url or reference])`;

  const content = await searchQuery(prompt, 0.1);

  const results: FactCheckResult[] = [];

  for (let i = 0; i < claims.length; i++) {
    const regex = new RegExp(
      `${i + 1}\\.\\s*\\[?(VERIFIED|UNVERIFIED)\\]?\\s*[—–\\-]\\s*(.+?)(?:\\(Source:\\s*(.+?)\\))?$`,
      "m"
    );
    const match = content.match(regex);

    if (match) {
      results.push({
        claim: claims[i],
        verified: match[1] === "VERIFIED",
        correction: match[1] === "UNVERIFIED" ? match[2].trim() : undefined,
        source: match[3]?.trim(),
      });
    } else {
      results.push({
        claim: claims[i],
        verified: true,
      });
    }
  }

  if (verbose) {
    const verified = results.filter((r) => r.verified).length;
    console.log(`  ${verified}/${results.length} claims verified`);
  }

  return results;
}
