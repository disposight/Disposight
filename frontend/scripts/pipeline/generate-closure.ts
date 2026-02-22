import OpenAI from "openai";
import { getOpenAIKey, PIPELINE_CONFIG } from "./config";
import type { BlogCategory } from "../../src/lib/blog/types";
import type { GenerateResult } from "./generate";
import type { ClosureResearch } from "./research";

const CLOSURE_SYSTEM_PROMPT = `Today's date is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

You are an expert content writer for DispoSight, a corporate distress intelligence platform that helps deal-driven organizations (liquidation firms, distressed PE, equipment remarketers, wholesale asset buyers) detect early signals of corporate distress and surface disposition opportunities.

CRITICAL REQUIREMENT: The article body MUST be between 800 and 1200 words. This is a fast-turnaround closure post — concise, news-style, and actionable.

Your audience is experienced professionals in distressed asset acquisition, corporate liquidation, and asset remarketing.

OUTPUT FORMAT: You must respond with ONLY valid JSON matching this exact structure (no markdown code fences, no extra text):

{
  "title": "string (max 70 chars, must contain the company name)",
  "description": "string (140-165 chars, must mention the company closure)",
  "primaryKeyword": "string (e.g. 'Big Lots closing')",
  "category": "string",
  "tags": ["string array, 5-8 relevant tags"],
  "body": "string (full markdown article body — MUST be 800-1200 words)",
  "faqs": [{"question": "string", "answer": "string"}],
  "sources": [{"title": "string", "url": "string"}]
}

ARTICLE STRUCTURE (use these exact sections as ## headings in the body). Write tight, factual paragraphs — no filler:

1. Start with a hook — 2-3 sentences. "[Company] is closing. Here's what asset buyers need to know." No heading for this intro.
2. ## What Happened — Summary of the closure announcement. Who, what, when, why.
3. ## Assets Becoming Available — What's up for grabs: inventory, fixtures, equipment, real estate leases, IT assets, vehicles, etc. Be specific about quantities and types where known.
4. ## Who's Handling the Liquidation — Known liquidator, auction houses, court-appointed trustees. If unknown, explain what to watch for.
5. ## Timeline & Key Dates — When sales start, when doors close, court dates. Specific dates where known.
6. ## How to Position — 3-5 actionable steps for buyers to get ahead of this opportunity.
7. ## What DispoSight Shows — 1 brief paragraph on how the platform surfaces these signals early.
8. ## Frequently Asked Questions — 3-5 closure-specific FAQs with 2-3 sentence answers (ALSO include in faqs array).
9. ## Disclaimer — Brief professional due diligence disclaimer.

RULES:
- Body MUST be 800-1200 words. This is a NEWS-STYLE post — be concise and factual.
- Do NOT include image placeholders [IMAGE_N] in the body — hero image only.
- Write in an urgent, authoritative tone — this is breaking industry intel.
- Use specific numbers, dates, and company names from the research data provided.
- The FAQs in the body AND the faqs array must match.
- Include credible sources in the sources array.
- Every heading must use ## markdown syntax.
- Do not use HTML tags in the body.`;

export async function generateClosurePost(
  research: ClosureResearch,
  category: BlogCategory,
  verbose = false
): Promise<GenerateResult> {
  const openai = new OpenAI({ apiKey: getOpenAIKey() });

  let lastError: Error | null = null;
  let lastWordCount = 0;

  for (let attempt = 1; attempt <= PIPELINE_CONFIG.openai.maxRetries; attempt++) {
    if (verbose) {
      console.log(`  Attempt ${attempt}/${PIPELINE_CONFIG.openai.maxRetries}...`);
    }

    const retryNote =
      attempt > 1
        ? `\n\nYOUR PREVIOUS ATTEMPT WAS ONLY ${lastWordCount} WORDS. You MUST write at least 800 words. Expand each section with specific details.`
        : "";

    const researchContext = [
      `Company: ${research.companyName}`,
      `What happened: ${research.whatHappened}`,
      research.storeCount ? `Store/location count: ${research.storeCount}` : null,
      research.employeeCount ? `Employee count: ${research.employeeCount}` : null,
      research.timeline ? `Timeline: ${research.timeline}` : null,
      research.liquidator ? `Liquidator: ${research.liquidator}` : null,
      research.assetTypes.length > 0 ? `Asset types: ${research.assetTypes.join(", ")}` : null,
      research.keyDates.length > 0 ? `Key dates:\n${research.keyDates.map((d) => `  - ${d}`).join("\n")}` : null,
      research.sources.length > 0
        ? `Sources:\n${research.sources.map((s) => `  - ${s.title}: ${s.url}`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = `Write a closure post (800-1200 words) about the "${research.companyName}" closure/shutdown for asset buyers.

Category: ${category}

RESEARCH DATA (use this to ground your writing in facts):
${researchContext}
${retryNote}`;

    try {
      const response = await openai.chat.completions.create({
        model: PIPELINE_CONFIG.openai.model,
        temperature: PIPELINE_CONFIG.openai.temperature,
        max_tokens: 8000,
        messages: [
          { role: "system", content: CLOSURE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const parsed = JSON.parse(content) as GenerateResult;

      if (!parsed.title || !parsed.body || !parsed.category) {
        throw new Error("Missing required fields in generated content");
      }

      const wordCount = parsed.body.split(/\s+/).filter(Boolean).length;
      lastWordCount = wordCount;

      if (verbose) {
        console.log(`  Generated: "${parsed.title}" (${wordCount} words)`);
      }

      // Accept 600+ on final attempt, 750+ earlier
      const minAcceptable = attempt >= PIPELINE_CONFIG.openai.maxRetries ? 600 : 750;
      if (wordCount < minAcceptable) {
        throw new Error(`Body too short: ${wordCount} words (need ${minAcceptable}+). Retrying.`);
      }

      parsed.category = category;

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (verbose) {
        console.error(`  Attempt ${attempt} failed: ${lastError.message}`);
      }
    }
  }

  throw new Error(`Failed after ${PIPELINE_CONFIG.openai.maxRetries} attempts: ${lastError?.message}`);
}
