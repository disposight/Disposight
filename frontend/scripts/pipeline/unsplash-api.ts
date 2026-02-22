import type { BlogImage } from "../../src/lib/blog/types";

export interface UnsplashApiResult {
  hero: BlogImage;
  body: BlogImage[];
  source: "api";
}

interface UnsplashPhoto {
  urls: { regular: string; raw: string };
  alt_description: string | null;
  description: string | null;
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

// In-memory cache for batch runs (--auto --count N)
const cache = new Map<string, UnsplashPhoto[]>();

// Words that don't translate to useful photographic results
const NON_VISUAL_WORDS = new Set([
  "strategy", "strategies", "guide", "analysis", "framework", "overview",
  "comprehensive", "complete", "ultimate", "essential", "introduction",
  "best", "practices", "tips", "trends", "insights", "approach",
  "understanding", "explained", "everything", "need", "know",
  "what", "when", "where", "which", "that", "this", "with",
  "from", "into", "about", "your", "their", "more", "most",
  "will", "does", "should", "could", "would", "have", "been",
  "than", "also", "just", "only", "very", "much", "many",
  "some", "other", "each", "every", "both", "such",
]);

// Category → concrete photographic scenes (ordered by specificity)
const CATEGORY_VISUAL_MAP: Record<string, string[]> = {
  "warn-act": ["corporate layoff office empty desks", "government building filing documents", "factory workers leaving plant"],
  "bankruptcy-guide": ["courthouse gavel legal proceedings", "bankruptcy filing documents desk", "judge courtroom law"],
  "industry-analysis": ["business analyst dashboard charts", "corporate boardroom presentation data", "market trading floor screens"],
  "asset-recovery": ["warehouse pallets inventory storage", "auction house bidding crowd", "salvage yard equipment recovery"],
  "due-diligence": ["lawyer reviewing documents magnifying", "audit financial paperwork inspection", "contract negotiation conference table"],
  "liquidation-strategy": ["store closing sale retail signs", "warehouse clearance auction crowd", "commercial property vacant building"],
  "equipment-remarketing": ["industrial machinery factory floor", "heavy equipment construction site", "server room technology hardware"],
  "distressed-investing": ["stock market trading financial charts", "wall street finance district", "investment portfolio risk analysis"],
};

/**
 * Extract visually concrete words from text, filtering out abstract business jargon.
 */
function extractVisualTerms(text: string, maxWords = 4): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !NON_VISUAL_WORDS.has(w))
    .slice(0, maxWords);
}

/**
 * Build the hero image query — most specific, drawn from title + keyword.
 */
function buildHeroQuery(
  title: string,
  primaryKeyword: string,
  category: string,
  companyName?: string
): string {
  // Closure posts: company name + concrete visual scene
  if (companyName) {
    return `${companyName} store closing`;
  }

  // Extract concrete terms from title (usually more descriptive than the keyword alone)
  const titleTerms = extractVisualTerms(title, 4);
  const keywordTerms = extractVisualTerms(primaryKeyword, 3);

  // Merge, keeping unique terms, title-first (more specific)
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const t of [...titleTerms, ...keywordTerms]) {
    if (!seen.has(t)) {
      seen.add(t);
      merged.push(t);
    }
  }

  if (merged.length >= 2) {
    // Take up to 4 concrete terms — enough context without being too narrow
    return merged.slice(0, 4).join(" ");
  }

  // Very short keyword — fall back to category visual
  const visuals = CATEGORY_VISUAL_MAP[category];
  return visuals?.[0] || "corporate business office";
}

/**
 * Build distinct queries for each body image slot using tags.
 * Each body image gets a different angle on the topic for visual variety.
 */
function buildBodyQueries(
  tags: string[],
  category: string,
  count: number
): string[] {
  if (count === 0) return [];

  const visuals = CATEGORY_VISUAL_MAP[category] || CATEGORY_VISUAL_MAP["industry-analysis"];
  const queries: string[] = [];

  // Each tag produces a unique query combining the tag's visual terms with category context
  for (const tag of tags) {
    if (queries.length >= count) break;
    const tagTerms = extractVisualTerms(tag, 3);
    if (tagTerms.length === 0) continue;

    // Pair the tag's terms with the category's first visual keyword for grounding
    const categoryAnchor = visuals[0].split(" ")[0]; // e.g., "courthouse", "warehouse"
    const query = [...tagTerms, categoryAnchor].join(" ");

    // Don't add near-duplicate queries
    const isDuplicate = queries.some((existing) => {
      const existingWords = new Set(existing.split(" "));
      const overlapCount = query.split(" ").filter((w) => existingWords.has(w)).length;
      return overlapCount >= 2;
    });

    if (!isDuplicate) {
      queries.push(query);
    }
  }

  // Fill remaining slots with category visual scenes (rotated)
  let visualIdx = 1; // skip [0], already used as anchor
  while (queries.length < count && visualIdx < visuals.length) {
    queries.push(visuals[visualIdx]);
    visualIdx++;
  }

  // Last resort: repeat the first category visual
  while (queries.length < count) {
    queries.push(visuals[0]);
  }

  return queries.slice(0, count);
}

/**
 * Build a broader fallback query when the specific one returns too few results.
 */
function buildFallbackQuery(category: string): string {
  const visuals = CATEGORY_VISUAL_MAP[category];
  return visuals?.[0] || "corporate business office";
}

function photoToImage(photo: UnsplashPhoto): BlogImage {
  const profileUrl = photo.user.links.html;
  const name = photo.user.name;
  return {
    url: `${photo.urls.regular}&w=1200&q=80`,
    alt: photo.alt_description || photo.description || "Blog illustration",
    credit: `Photo by [${name}](${profileUrl}) on [Unsplash](https://unsplash.com)`,
  };
}

/**
 * Fire-and-forget download tracking per Unsplash API guidelines.
 * https://help.unsplash.com/en/articles/2511258-guideline-triggering-a-download
 */
function trackDownload(photo: UnsplashPhoto, accessKey: string): void {
  const url = `${photo.links.download_location}?client_id=${accessKey}`;
  fetch(url).catch(() => {
    // Silently ignore — tracking is best-effort
  });
}

/**
 * Search Unsplash for a single query. Returns cached results if available.
 */
async function searchUnsplash(
  query: string,
  accessKey: string,
  perPage = 10
): Promise<UnsplashPhoto[]> {
  if (cache.has(query)) return cache.get(query)!;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`   Unsplash API error ${res.status}: ${text.slice(0, 200)}`);
    return [];
  }

  const data = (await res.json()) as { results: UnsplashPhoto[] };
  cache.set(query, data.results);
  return data.results;
}

export async function fetchUnsplashImages(
  primaryKeyword: string,
  category: string,
  bodyCount: number,
  verbose?: boolean,
  companyName?: string,
  title?: string,
  tags?: string[]
): Promise<UnsplashApiResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    if (verbose) console.log("   No UNSPLASH_ACCESS_KEY — skipping API");
    return null;
  }

  try {
    // --- Hero image ---
    const heroQuery = buildHeroQuery(title || primaryKeyword, primaryKeyword, category, companyName);
    if (verbose) console.log(`   Unsplash hero query: "${heroQuery}"`);

    let heroPhotos = await searchUnsplash(heroQuery, accessKey);

    // Retry with broader category query if too specific
    if (heroPhotos.length === 0) {
      const fallback = buildFallbackQuery(category);
      if (verbose) console.log(`   Hero query returned 0 — broadening to: "${fallback}"`);
      heroPhotos = await searchUnsplash(fallback, accessKey);
    }

    if (heroPhotos.length === 0) {
      if (verbose) console.log("   Unsplash returned 0 results for hero");
      return null;
    }

    const hero = photoToImage(heroPhotos[0]);
    trackDownload(heroPhotos[0], accessKey);
    if (verbose) console.log(`   Hero: "${heroPhotos[0].alt_description || "(no alt)"}"`);

    // --- Body images ---
    if (bodyCount === 0) {
      return { hero, body: [], source: "api" };
    }

    const body: BlogImage[] = [];
    const usedPhotoIds = new Set<string>([heroPhotos[0].urls.regular]);

    // Generate distinct queries per body slot from tags
    const bodyQueries = buildBodyQueries(tags || [], category, bodyCount);

    for (let i = 0; i < bodyQueries.length; i++) {
      const q = bodyQueries[i];
      if (verbose) console.log(`   Unsplash body[${i}] query: "${q}"`);

      const photos = await searchUnsplash(q, accessKey);

      // Pick the first photo we haven't used yet
      const pick = photos.find((p) => !usedPhotoIds.has(p.urls.regular));
      if (pick) {
        body.push(photoToImage(pick));
        trackDownload(pick, accessKey);
        usedPhotoIds.add(pick.urls.regular);
        if (verbose) console.log(`   Body[${i}]: "${pick.alt_description || "(no alt)"}"`);
      }
    }

    // If some body slots unfilled (queries returned only duplicates), pull extras from hero results
    if (body.length < bodyCount) {
      for (const photo of heroPhotos) {
        if (body.length >= bodyCount) break;
        if (!usedPhotoIds.has(photo.urls.regular)) {
          body.push(photoToImage(photo));
          trackDownload(photo, accessKey);
          usedPhotoIds.add(photo.urls.regular);
        }
      }
    }

    if (verbose) console.log(`   Unsplash total: 1 hero + ${body.length} body`);

    return { hero, body, source: "api" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`   Unsplash API fetch failed: ${msg}`);
    return null;
  }
}
