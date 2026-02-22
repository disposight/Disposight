import OpenAI from "openai";
import { getOpenAIKey, PIPELINE_CONFIG } from "./config";
import type { BlogCategory } from "../../src/lib/blog/types";

const SYSTEM_PROMPT = `Today's date is ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.

You are an expert content writer for DispoSight, a corporate distress intelligence platform that helps deal-driven organizations (liquidation firms, distressed PE, equipment remarketers, wholesale asset buyers) detect early signals of corporate distress and surface disposition opportunities.

CRITICAL REQUIREMENT: The article body MUST be between 1500 and 2500 words. Articles under 1500 words will be rejected. Write thorough, detailed content for each section. Each section should have multiple detailed paragraphs. Do NOT summarize or abbreviate.

Your audience is experienced professionals in distressed asset acquisition, corporate liquidation, and asset remarketing.

OUTPUT FORMAT: You must respond with ONLY valid JSON matching this exact structure (no markdown code fences, no extra text):

{
  "title": "string (max 70 chars, must contain the primary keyword)",
  "description": "string (140-165 chars, must contain the primary keyword)",
  "primaryKeyword": "string",
  "category": "string (one of: industry-analysis, asset-recovery, bankruptcy-guide, warn-act, due-diligence, liquidation-strategy, equipment-remarketing, distressed-investing)",
  "tags": ["string array, 5-8 relevant tags"],
  "body": "string (full markdown article body — MUST be 1500-2500 words, will be rejected if under 1500)",
  "faqs": [{"question": "string", "answer": "string"}],
  "sources": [{"title": "string", "url": "string"}]
}

ARTICLE STRUCTURE (use these exact sections as ## headings in the body). Write 2-4 paragraphs per section, with specific details, examples, and data points:

1. Start with a hook — 2-3 sentences, a sharp observation about the distress/opportunity landscape. No heading for this intro paragraph.
2. ## Quick Answer — 3-6 detailed bullet points directly answering the topic query. Each bullet should be 2-3 sentences.
3. ## Market Snapshot — 3-4 paragraphs on key stats, trends, and current market conditions with specific numbers. Include [IMAGE_1] on its own line.
4. ## Step-by-Step Guide — 5 numbered actionable steps, each with a paragraph of explanation. Include [IMAGE_2] on its own line.
5. ## Decision Framework — 2-3 paragraphs with "If this situation... then do that" practical evaluation guidance. Use concrete scenarios.
6. ## Opportunity Playbook — 2-3 paragraphs on how to identify and act on opportunities. Include real company examples. Include [IMAGE_3] on its own line.
7. ## Common Mistakes — 10-12 deal-killing mistakes, each with a sentence of explanation.
8. ## How DispoSight Helps — 1-2 paragraphs, brief non-aggressive value proposition for DispoSight's platform.
9. ## Frequently Asked Questions — 5-8 real questions with 2-4 sentence answers each (ALSO include these in the faqs array).
10. ## Action Plan — 8-10 item actionable checklist to implement immediately.
11. ## Related Reading — 3-5 placeholder internal links (use format: [Title](/blog/suggested-slug))
12. ## Disclaimer — Professional due diligence disclaimer paragraph.

RULES:
- MINIMUM 1500 words in the body field. Write detailed, substantive content. Do not abbreviate.
- Write in a professional, authoritative tone — not salesy
- Use concrete examples with real companies and real situations where possible
- Include specific numbers, percentages, and timeframes
- Image placeholders [IMAGE_1], [IMAGE_2], [IMAGE_3] must each be on their own line
- The FAQs in the body AND the faqs array must match
- Include 3-5 credible sources in the sources array
- Every heading must use ## or ### markdown syntax
- Do not use HTML tags in the body`;

export interface GenerateResult {
  title: string;
  description: string;
  primaryKeyword: string;
  category: BlogCategory;
  tags: string[];
  body: string;
  faqs: { question: string; answer: string }[];
  sources: { title: string; url: string }[];
}

export async function generatePost(
  topic: string,
  categoryOverride?: BlogCategory,
  verbose = false
): Promise<GenerateResult> {
  const openai = new OpenAI({ apiKey: getOpenAIKey() });

  let lastError: Error | null = null;
  let lastWordCount = 0;

  for (let attempt = 1; attempt <= PIPELINE_CONFIG.openai.maxRetries; attempt++) {
    if (verbose) {
      console.log(`  Attempt ${attempt}/${PIPELINE_CONFIG.openai.maxRetries}...`);
    }

    // Escalate word count demand on retries
    const minWords = attempt === 1 ? 1500 : 2000;
    const retryNote =
      attempt > 1
        ? `\n\nYOUR PREVIOUS ATTEMPT WAS ONLY ${lastWordCount} WORDS. THIS IS TOO SHORT. You MUST write at least ${minWords} words in the body. Write 3-4 detailed paragraphs per section. Expand every section with specific examples, statistics, and actionable advice.`
        : "";

    const userPrompt = [
      `Write a comprehensive, detailed article (MINIMUM ${minWords} words in the body) about: "${topic}"`,
      categoryOverride ? `\nCategory: ${categoryOverride}` : "",
      `\nThe body field MUST contain at least ${minWords} words. Write multiple detailed paragraphs for each section. Use specific examples, real company names, dollar amounts, and precise timelines.`,
      retryNote,
    ].join("");

    try {
      const response = await openai.chat.completions.create({
        model: PIPELINE_CONFIG.openai.model,
        temperature: PIPELINE_CONFIG.openai.temperature,
        max_tokens: 16000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const parsed = JSON.parse(content) as GenerateResult;

      // Basic validation
      if (!parsed.title || !parsed.body || !parsed.category) {
        throw new Error("Missing required fields in generated content");
      }

      const wordCount = parsed.body.split(/\s+/).filter(Boolean).length;
      lastWordCount = wordCount;

      if (verbose) {
        console.log(`  Generated: "${parsed.title}" (${wordCount} words)`);
      }

      // Retry if word count is too low — accept 1000+ on final attempt, 1400+ earlier
      const minAcceptable = attempt >= PIPELINE_CONFIG.openai.maxRetries ? 1000 : 1400;
      if (wordCount < minAcceptable) {
        throw new Error(`Body too short: ${wordCount} words (need ${minAcceptable}+). Retrying.`);
      }

      if (categoryOverride) {
        parsed.category = categoryOverride;
      }

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
