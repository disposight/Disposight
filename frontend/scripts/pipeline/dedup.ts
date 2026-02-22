import fs from "fs";
import path from "path";
import type { BlogPostIndex, BlogPost } from "../../src/lib/blog/types";

const INDEX_PATH = path.join(process.cwd(), "content", "_system", "contentIndex.json");
const BLOG_DIR = path.join(process.cwd(), "content", "blog");

// Common words to ignore when computing overlap
const OVERLAP_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "not", "no", "vs", "how",
  "what", "when", "where", "why", "who", "which", "that", "this", "it",
  "its", "if", "so", "up", "out", "all", "more", "some", "any", "new",
  "top", "best", "most", "only", "also", "just", "about", "your", "our",
  "their", "every", "each", "into",
]);

export interface ExistingPostFingerprint {
  slug: string;
  title: string;
  /** Significant words from title + tags + primaryKeyword + description */
  words: Set<string>;
  primaryKeyword: string;
  tags: string[];
}

/** Extract significant words from text, lowercased and filtered. */
function extractSignificantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !OVERLAP_STOP_WORDS.has(w));
}

/**
 * Load fingerprints of all existing published posts.
 * Reads index for basic data, then reads individual post JSONs for primaryKeyword.
 */
export function loadExistingFingerprints(): ExistingPostFingerprint[] {
  let index: BlogPostIndex[] = [];
  try {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    return []; // No index yet
  }

  const fingerprints: ExistingPostFingerprint[] = [];

  for (const entry of index) {
    if (entry.isDraft) continue;

    // Try to read primaryKeyword from full post JSON
    let primaryKeyword = "";
    try {
      const postPath = path.join(BLOG_DIR, `${entry.slug}.json`);
      const post: BlogPost = JSON.parse(fs.readFileSync(postPath, "utf-8"));
      primaryKeyword = post.primaryKeyword || "";
    } catch {
      // Full post file missing — use what we have from index
    }

    // Build word set from all text signals
    const allText = [
      entry.title,
      entry.description,
      primaryKeyword,
      ...entry.tags,
    ].join(" ");

    const words = new Set(extractSignificantWords(allText));

    fingerprints.push({
      slug: entry.slug,
      title: entry.title,
      words,
      primaryKeyword,
      tags: entry.tags.map((t) => t.toLowerCase()),
    });
  }

  return fingerprints;
}

/**
 * Compute Jaccard similarity between two word sets.
 * Returns 0-1 (0 = no overlap, 1 = identical).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  /** Exact slug match */
  exactSlugMatch: boolean;
  /** Closest existing post by topic overlap */
  closestMatch: { slug: string; title: string; similarity: number } | null;
  reason: string;
}

/**
 * Check if a keyword/topic would duplicate an existing post.
 * Returns detailed info about the overlap.
 *
 * @param keyword - The keyword or topic to check
 * @param fingerprints - Pre-loaded fingerprints (call loadExistingFingerprints() once)
 * @param threshold - Jaccard similarity threshold to flag as duplicate (default 0.5)
 */
export function checkDuplicate(
  keyword: string,
  fingerprints: ExistingPostFingerprint[],
  threshold = 0.5
): DuplicateCheckResult {
  if (fingerprints.length === 0) {
    return { isDuplicate: false, exactSlugMatch: false, closestMatch: null, reason: "" };
  }

  const keywordLower = keyword.toLowerCase();
  const keywordWords = new Set(extractSignificantWords(keyword));

  // Check 1: Exact keyword match against primaryKeyword
  for (const fp of fingerprints) {
    if (fp.primaryKeyword.toLowerCase() === keywordLower) {
      return {
        isDuplicate: true,
        exactSlugMatch: false,
        closestMatch: { slug: fp.slug, title: fp.title, similarity: 1.0 },
        reason: `Exact primary keyword match with "${fp.title}"`,
      };
    }
  }

  // Check 1b: Same significant words in different order (e.g. "distressed debt investing" vs "investing in distressed debt")
  for (const fp of fingerprints) {
    if (!fp.primaryKeyword) continue;
    const fpKeywordWords = new Set(extractSignificantWords(fp.primaryKeyword));
    // All significant words of the input are in the existing keyword (or vice versa)
    if (keywordWords.size >= 2 && fpKeywordWords.size >= 2) {
      const inputInExisting = [...keywordWords].every((w) => fpKeywordWords.has(w));
      const existingInInput = [...fpKeywordWords].every((w) => keywordWords.has(w));
      if (inputInExisting || existingInInput) {
        return {
          isDuplicate: true,
          exactSlugMatch: false,
          closestMatch: { slug: fp.slug, title: fp.title, similarity: 0.95 },
          reason: `Same keywords (different order) as "${fp.title}"`,
        };
      }
    }
  }

  // Check 2: Keyword is a substring of an existing title or vice versa
  for (const fp of fingerprints) {
    const titleLower = fp.title.toLowerCase();
    if (titleLower.includes(keywordLower) || keywordLower.includes(titleLower.slice(0, 30))) {
      return {
        isDuplicate: true,
        exactSlugMatch: false,
        closestMatch: { slug: fp.slug, title: fp.title, similarity: 0.9 },
        reason: `Keyword contained in existing title "${fp.title}"`,
      };
    }
  }

  // Check 3: Keyword is in existing tags
  for (const fp of fingerprints) {
    if (fp.tags.includes(keywordLower)) {
      return {
        isDuplicate: true,
        exactSlugMatch: false,
        closestMatch: { slug: fp.slug, title: fp.title, similarity: 0.8 },
        reason: `Keyword matches tag in "${fp.title}"`,
      };
    }
  }

  // Check 4: Jaccard word overlap
  let bestMatch: { slug: string; title: string; similarity: number } | null = null;
  for (const fp of fingerprints) {
    const sim = jaccardSimilarity(keywordWords, fp.words);
    if (!bestMatch || sim > bestMatch.similarity) {
      bestMatch = { slug: fp.slug, title: fp.title, similarity: sim };
    }
  }

  if (bestMatch && bestMatch.similarity >= threshold) {
    return {
      isDuplicate: true,
      exactSlugMatch: false,
      closestMatch: bestMatch,
      reason: `${Math.round(bestMatch.similarity * 100)}% topic overlap with "${bestMatch.title}"`,
    };
  }

  return {
    isDuplicate: false,
    exactSlugMatch: false,
    closestMatch: bestMatch,
    reason: "",
  };
}

/**
 * Filter a list of keywords, removing those that overlap with existing posts.
 * Returns the filtered list and a count of how many were removed.
 */
export function filterDuplicateKeywords(
  keywords: { keyword: string; [key: string]: unknown }[],
  fingerprints: ExistingPostFingerprint[],
  verbose = false
): { filtered: typeof keywords; removedCount: number } {
  if (fingerprints.length === 0) {
    return { filtered: keywords, removedCount: 0 };
  }

  let removedCount = 0;
  const filtered = keywords.filter((item) => {
    const check = checkDuplicate(item.keyword, fingerprints);
    if (check.isDuplicate) {
      removedCount++;
      if (verbose) {
        console.log(`  [SKIP] "${item.keyword}" — ${check.reason}`);
      }
      return false;
    }
    return true;
  });

  return { filtered, removedCount };
}
