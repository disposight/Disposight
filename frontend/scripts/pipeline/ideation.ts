import type { BlogCategory } from "../../src/lib/blog/types";
import { BLOG_CATEGORIES } from "../../src/lib/blog/types";
import { PIPELINE_CONFIG } from "./config";
import { discoverBlogIdeas, enrichKeywordsWithSearch } from "./research";
import { fetchKeywordData, fetchKeywordVolumes, type KeywordData } from "./dataforseo";
import { getSeedKeywords } from "./seed-keywords";
import { loadExistingFingerprints, checkDuplicate, type ExistingPostFingerprint } from "./dedup";

const { scoring } = PIPELINE_CONFIG;

// Words too generic to use as relevance signals
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "not", "no", "non", "vs",
  "how", "what", "when", "where", "why", "who", "which", "that", "this",
  "it", "its", "if", "so", "up", "out", "all", "more", "some", "any",
  "new", "top", "best", "most", "only", "also", "just", "about",
]);

// Domain words that indicate relevance to DispoSight topics
const DOMAIN_WORDS = new Set([
  "distress", "distressed", "bankruptcy", "liquidation", "liquidate",
  "asset", "assets", "disposition", "acquisition", "restructuring",
  "insolvency", "insolvent", "foreclosure", "receivership", "creditor",
  "debtor", "auction", "remarketing", "remarket", "surplus", "salvage",
  "decommission", "decommissioned", "layoff", "layoffs", "closure",
  "closing", "shutdown", "warn", "chapter", "trustee", "corporate",
  "company", "companies", "business", "equipment", "inventory",
  "valuation", "appraisal", "diligence", "investment", "investing",
  "investor", "deal", "deals", "merger", "mergers", "m&a",
  "turnaround", "recovery", "pe", "private", "equity", "debt",
  "loan", "npl", "performing", "special", "situations", "vulture",
]);

/**
 * Check if a DataForSEO keyword suggestion is relevant to the category.
 * Returns true if the keyword shares at least 1 domain-relevant word
 * with the seed keywords or has at least 2 words from the seed set.
 */
function isRelevantKeyword(
  keyword: string,
  seedKeywords: string[],
  category: string
): boolean {
  const kwWords = keyword.toLowerCase().split(/[\s-]+/).filter(w => w.length > 1);

  // Build word set from seeds + category
  const seedWords = new Set<string>();
  for (const seed of seedKeywords) {
    for (const w of seed.toLowerCase().split(/[\s-]+/)) {
      if (!STOP_WORDS.has(w) && w.length > 2) {
        seedWords.add(w);
      }
    }
  }
  for (const w of category.toLowerCase().split(/[\s-]+/)) {
    if (!STOP_WORDS.has(w) && w.length > 2) {
      seedWords.add(w);
    }
  }

  // Check domain word overlap + seed word overlap
  const domainHits = kwWords.filter(w => DOMAIN_WORDS.has(w)).length;
  const seedHits = kwWords.filter(w => seedWords.has(w)).length;

  // Strong relevance: 2+ domain words (e.g. "distressed asset auction")
  if (domainHits >= 2) return true;
  // Moderate relevance: 1 domain word + 1 seed word (e.g. "asset liquidation timeline")
  if (domainHits >= 1 && seedHits >= 1) return true;
  // Seed-only relevance: 2+ seed words (e.g. keywords using category-specific terms)
  if (seedHits >= 2) return true;

  return false;
}

export interface ScoredIdea {
  keyword: string;
  description: string;
  score: number;
  scoreBreakdown: {
    searchVolume: number;
    keywordDifficulty: number;
    serpFeatures: number;
    relatedQuestions: number;
    keywordQuality: number;
    relevanceBonus: number;
  };
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  serpFeatures: string[];
  searchIntent: string;
  relevanceScore: number;
  volumeSource: "dataforseo" | "openai-estimate" | "none";
}

export function computeOpportunityScore(
  searchVolume: number,
  keywordDifficulty: number,
  serpFeatures: string[],
  relatedQuestionsCount: number,
  keyword: string,
  relevanceScore: number,
  volumeSource: ScoredIdea["volumeSource"]
): { score: number; breakdown: ScoredIdea["scoreBreakdown"] } {
  // Search volume score (0-30) — logarithmic scale
  let volumeScore = 0;
  if (searchVolume > 0) {
    // 10 vol → ~10pts, 100 vol → ~20pts, 1000 vol → ~30pts
    const rawVolumeScore = Math.min(scoring.maxSearchVolume, Math.round(Math.log10(searchVolume + 1) * 10));
    // Cap OpenAI estimates at 60% of max — unvalidated volume shouldn't outscore real data
    volumeScore = volumeSource === "openai-estimate"
      ? Math.min(rawVolumeScore, Math.round(scoring.maxSearchVolume * 0.6))
      : rawVolumeScore;
  }

  // Keyword difficulty score (0-20) — inverted (lower difficulty = more points)
  let difficultyScore = 0;
  if (keywordDifficulty > 0) {
    difficultyScore = Math.round(((100 - keywordDifficulty) / 100) * scoring.maxKeywordDifficulty);
  } else {
    // KD=0 from DataForSEO means genuinely easy; unknown = half credit
    difficultyScore = volumeSource === "dataforseo"
      ? scoring.maxKeywordDifficulty
      : Math.round(scoring.maxKeywordDifficulty * 0.5);
  }

  // SERP features score (0-20)
  const serpScore = Math.min(
    scoring.maxSerpFeatures,
    serpFeatures.length * 5
  );

  // Related questions score (0-20)
  const questionsScore = Math.min(
    scoring.maxRelatedQuestions,
    Math.round((relatedQuestionsCount / 10) * scoring.maxRelatedQuestions)
  );

  // Keyword quality score (0-10) — 2-6 word keywords are ideal
  const wordCount = keyword.split(/\s+/).length;
  const qualityScore = wordCount >= 2 && wordCount <= 6 ? scoring.maxKeywordQuality : 5;

  // Relevance bonus (0-10) — always capped at 10 regardless of data source
  const relevanceBonus = Math.round((relevanceScore / 10) * 10);

  const total = volumeScore + difficultyScore + serpScore + questionsScore + qualityScore + relevanceBonus;

  return {
    score: Math.min(100, total),
    breakdown: {
      searchVolume: volumeScore,
      keywordDifficulty: difficultyScore,
      serpFeatures: serpScore,
      relatedQuestions: questionsScore,
      keywordQuality: qualityScore,
      relevanceBonus,
    },
  };
}

export async function discoverAndScoreIdeas(
  category: BlogCategory,
  verbose = false
): Promise<ScoredIdea[]> {
  const categoryInfo = BLOG_CATEGORIES[category];
  console.log(`\nDiscovering ideas for: ${categoryInfo?.name || category}`);

  // --- Phase 1: OpenAI web search brainstorms ideas ---
  console.log("\nPhase 1: OpenAI web search brainstorming...");
  const aiIdeas = await discoverBlogIdeas(category, verbose);
  console.log(`  ${aiIdeas.length} ideas generated`);

  // --- Phase 2: DataForSEO validates with real data ---
  console.log("\nPhase 2: DataForSEO keyword validation...");
  const seedKeywords = getSeedKeywords(category);
  const aiKeywords = aiIdeas
    .slice(0, PIPELINE_CONFIG.ideation.topIdeasForValidation)
    .map((idea) => idea.keyword);

  const keywordDataMap = new Map<string, KeywordData>();

  // Seed keywords → suggestions endpoint (discovers related keywords)
  // AI keywords → bulk volume endpoint (validates exact keywords with real volume/KD/CPC)
  const [suggestionData, bulkVolumeData] = await Promise.all([
    fetchKeywordData(seedKeywords, verbose).catch((err) => {
      console.warn(`  ⚠ Suggestions endpoint failed: ${err instanceof Error ? err.message : err}`);
      return [] as KeywordData[];
    }),
    fetchKeywordVolumes(aiKeywords, verbose).catch((err) => {
      console.warn(`  ⚠ Bulk volume endpoint failed: ${err instanceof Error ? err.message : err}`);
      return [] as KeywordData[];
    }),
  ]);

  // Load suggestions first (lower priority)
  for (const kd of suggestionData) {
    keywordDataMap.set(kd.keyword.toLowerCase(), kd);
  }
  // Bulk volume overwrites (higher priority — exact match data)
  for (const kd of bulkVolumeData) {
    keywordDataMap.set(kd.keyword.toLowerCase(), kd);
  }

  console.log(`  ${suggestionData.length} keyword suggestions discovered`);
  console.log(`  ${bulkVolumeData.filter(kd => kd.searchVolume > 0).length}/${aiKeywords.length} AI keywords validated with real volume`);
  if (suggestionData.length === 0 && bulkVolumeData.length === 0) {
    console.log(`  ⚠ No DataForSEO data — will score using OpenAI estimates only`);
  }

  // --- Phase 3: OpenAI web search enriches gaps ---
  const zeroVolumeKeywords = aiIdeas
    .filter((idea) => {
      const data = keywordDataMap.get(idea.keyword.toLowerCase());
      return !data || data.searchVolume === 0;
    })
    .map((idea) => idea.keyword);

  const enrichedMap = new Map<string, { estimatedVolume: number; relevanceScore: number }>();

  if (zeroVolumeKeywords.length > 0) {
    console.log(`\nPhase 3: OpenAI enriching ${zeroVolumeKeywords.length} gaps...`);
    const enriched = await enrichKeywordsWithSearch(zeroVolumeKeywords, category, verbose);
    for (const e of enriched) {
      enrichedMap.set(e.keyword.toLowerCase(), {
        estimatedVolume: e.estimatedVolume,
        relevanceScore: e.relevanceScore,
      });
    }
  } else {
    console.log("\nPhase 3: No gaps to enrich (all keywords have volume data)");
  }

  // --- Score all ideas ---
  console.log("\nScoring ideas...");
  const scored: ScoredIdea[] = [];

  for (const idea of aiIdeas) {
    const keyLower = idea.keyword.toLowerCase();
    const dfsData = keywordDataMap.get(keyLower);
    const enrichData = enrichedMap.get(keyLower);

    // Merge volume: prefer DataForSEO, fallback to OpenAI estimate
    let searchVolume = dfsData?.searchVolume || 0;
    let volumeSource: ScoredIdea["volumeSource"] = "none";

    if (searchVolume > 0) {
      volumeSource = "dataforseo";
    } else if (enrichData && enrichData.estimatedVolume > 0) {
      searchVolume = enrichData.estimatedVolume;
      volumeSource = "openai-estimate";
    }

    const keywordDifficulty = dfsData?.keywordDifficulty || 0;
    const serpFeatures = dfsData?.serpFeatures || [];
    const paaCount = serpFeatures.filter((f) => f === "people_also_ask").length;
    const relevance = enrichData?.relevanceScore || 5;

    const { score, breakdown } = computeOpportunityScore(
      searchVolume,
      keywordDifficulty,
      serpFeatures,
      paaCount,
      idea.keyword,
      relevance,
      volumeSource
    );

    scored.push({
      keyword: idea.keyword,
      description: idea.description,
      score,
      scoreBreakdown: breakdown,
      searchVolume,
      keywordDifficulty,
      cpc: dfsData?.cpc || 0,
      serpFeatures,
      searchIntent: dfsData?.searchIntent || "informational",
      relevanceScore: relevance,
      volumeSource,
    });
  }

  // Also score DataForSEO suggestions that weren't in AI-brainstormed results
  // Filter for relevance to avoid junk like "non-erosive reflux disease"
  const allSeedKeywords = [...seedKeywords, ...aiKeywords];
  let filteredOut = 0;
  for (const kd of suggestionData) {
    const keyLower = kd.keyword.toLowerCase();
    const alreadyScored = scored.some((s) => s.keyword.toLowerCase() === keyLower);
    if (alreadyScored) continue;

    // Relevance filter: skip keywords that aren't related to the category
    if (!isRelevantKeyword(kd.keyword, allSeedKeywords, category)) {
      filteredOut++;
      continue;
    }

    const paaCount = kd.serpFeatures.filter((f) => f === "people_also_ask").length;
    const dfsVolumeSource: ScoredIdea["volumeSource"] = kd.searchVolume > 0 ? "dataforseo" : "none";
    const { score, breakdown } = computeOpportunityScore(
      kd.searchVolume,
      kd.keywordDifficulty,
      kd.serpFeatures,
      paaCount,
      kd.keyword,
      5, // default relevance for DataForSEO-only suggestions
      dfsVolumeSource
    );

    scored.push({
      keyword: kd.keyword,
      description: `DataForSEO suggestion (${kd.searchVolume} vol, ${kd.keywordDifficulty} KD)`,
      score,
      scoreBreakdown: breakdown,
      searchVolume: kd.searchVolume,
      keywordDifficulty: kd.keywordDifficulty,
      cpc: kd.cpc,
      serpFeatures: kd.serpFeatures,
      searchIntent: kd.searchIntent,
      relevanceScore: 5,
      volumeSource: kd.searchVolume > 0 ? "dataforseo" : "none",
    });
  }

  if (verbose && filteredOut > 0) {
    console.log(`  Filtered out ${filteredOut} irrelevant DataForSEO suggestions`);
  }

  // --- Dedup: remove ideas that overlap with existing published posts ---
  const fingerprints = loadExistingFingerprints();
  if (fingerprints.length > 0) {
    let dedupRemoved = 0;
    const deduped = scored.filter((idea) => {
      const check = checkDuplicate(idea.keyword, fingerprints);
      if (check.isDuplicate) {
        dedupRemoved++;
        if (verbose) {
          console.log(`  [DEDUP] "${idea.keyword}" — ${check.reason}`);
        }
        return false;
      }
      return true;
    });

    if (dedupRemoved > 0) {
      console.log(`  Removed ${dedupRemoved} ideas that overlap with existing posts`);
    }

    // Sort by score descending
    deduped.sort((a, b) => b.score - a.score);
    return deduped;
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

export function formatScoredIdeas(ideas: ScoredIdea[], limit = 20): string {
  const top = ideas.slice(0, limit);
  const lines: string[] = [];

  lines.push("");
  lines.push("┌─────┬───────┬─────────┬────┬───────┬──────────────────────────────────────────────────┐");
  lines.push("│ Rank│ Score │ Volume  │ KD │  CPC  │ Keyword                                          │");
  lines.push("├─────┼───────┼─────────┼────┼───────┼──────────────────────────────────────────────────┤");

  for (let i = 0; i < top.length; i++) {
    const idea = top[i];
    const rank = String(i + 1).padStart(3);
    const score = String(idea.score).padStart(4);
    const vol =
      idea.searchVolume > 0
        ? String(idea.searchVolume).padStart(7) + (idea.volumeSource === "openai-estimate" ? "~" : " ")
        : "     n/a";
    const kd = idea.keywordDifficulty > 0 ? String(idea.keywordDifficulty).padStart(3) : "n/a";
    const cpc = idea.cpc > 0 ? `$${idea.cpc.toFixed(2)}`.padStart(6) : "  n/a ";
    const keyword = idea.keyword.slice(0, 48).padEnd(48);

    lines.push(`│ ${rank} │ ${score}  │ ${vol}│ ${kd}│ ${cpc}│ ${keyword} │`);
  }

  lines.push("└─────┴───────┴─────────┴────┴───────┴──────────────────────────────────────────────────┘");
  lines.push("");
  lines.push("Volume with ~ = OpenAI estimate (DataForSEO had no data)");

  return lines.join("\n");
}
