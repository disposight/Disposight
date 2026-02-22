/**
 * One-time migration: replace old hardcoded Unsplash pool images + AI hero images
 * in existing blog posts with fresh, topic-relevant Unsplash API photos.
 *
 * Uses ONE API call per post (hero + body from same result set) to stay well
 * within Unsplash free tier (50 req/hour). Retries on 429/403 with backoff.
 *
 * Usage: npx tsx scripts/migrate-blog-images.ts [--dry-run] [--verbose]
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";

// Load env
config({ path: path.join(process.cwd(), ".env.local") });

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

interface BlogImage {
  url: string;
  alt: string;
  credit: string;
}

interface BlogPost {
  slug: string;
  title: string;
  primaryKeyword: string;
  category: string;
  tags: string[];
  heroImage: BlogImage;
  images: BlogImage[];
  body: string;
  [key: string]: unknown;
}

interface UnsplashPhoto {
  urls: { regular: string };
  alt_description: string | null;
  description: string | null;
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

// Words that don't produce good photo results
const STOP_WORDS = new Set([
  "strategy", "strategies", "guide", "analysis", "framework", "overview",
  "comprehensive", "complete", "ultimate", "essential", "introduction",
  "understanding", "navigating", "explained", "depth",
  "the", "and", "for", "how", "what", "when", "where", "which",
  "that", "this", "with", "from", "into", "about",
]);

function buildQuery(title: string, primaryKeyword: string, tags: string[]): string {
  // Extract concrete terms from title + keyword + first 2 tags
  const allText = [title, primaryKeyword, ...tags.slice(0, 2)].join(" ");
  const terms = allText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Deduplicate, keep order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of terms) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }

  // Take 3-5 terms for a focused but not overly narrow query
  return unique.slice(0, 5).join(" ");
}

function photoToImage(photo: UnsplashPhoto): BlogImage {
  return {
    url: `${photo.urls.regular}&w=1200&q=80`,
    alt: photo.alt_description || photo.description || "Blog illustration",
    credit: `Photo by [${photo.user.name}](${photo.user.links.html}) on [Unsplash](https://unsplash.com)`,
  };
}

function trackDownload(photo: UnsplashPhoto, accessKey: string): void {
  fetch(`${photo.links.download_location}?client_id=${accessKey}`).catch(() => {});
}

/**
 * Single API call — returns hero + body images from one search.
 * Retries with exponential backoff on rate limit.
 */
async function fetchImagesForPost(
  query: string,
  needed: number,
  accessKey: string,
  verbose: boolean,
  retries = 3
): Promise<UnsplashPhoto[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.max(10, needed)));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (res.ok) {
      const data = (await res.json()) as { results: UnsplashPhoto[] };
      return data.results;
    }

    if (res.status === 403 || res.status === 429) {
      const waitSec = 30 * Math.pow(2, attempt); // 30s, 60s, 120s
      if (attempt < retries) {
        console.log(`  Rate limited — waiting ${waitSec}s before retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
    }

    const text = await res.text();
    console.warn(`  Unsplash API error ${res.status}: ${text.slice(0, 200)}`);
    return [];
  }

  return [];
}

/**
 * Replace inline image markdown in the body.
 * Matches: ![alt text](url)\n*Photo: credit*
 */
function replaceInlineImages(body: string, oldImages: BlogImage[], newImages: BlogImage[]): string {
  let result = body;

  for (let i = 0; i < oldImages.length && i < newImages.length; i++) {
    const old = oldImages[i];
    const replacement = newImages[i];

    const escapedUrl = old.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `!\\[[^\\]]*\\]\\(${escapedUrl}\\)\\n\\*Photo: [^*]*\\*`,
      "g"
    );

    const newMarkdown = `![${replacement.alt}](${replacement.url})\n*Photo: ${replacement.credit}*`;
    result = result.replace(pattern, newMarkdown);
  }

  return result;
}

async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.error("UNSPLASH_ACCESS_KEY not found in .env.local");
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} blog posts to migrate.`);
  if (dryRun) console.log("DRY RUN — no files will be modified.");

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const post: BlogPost = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Skip already-migrated posts (have Unsplash API credits with markdown links)
    if (post.heroImage.credit.includes("[Unsplash]")) {
      console.log(`\n--- ${post.slug} --- ALREADY MIGRATED, skipping`);
      skipped++;
      continue;
    }

    console.log(`\n--- ${post.slug} ---`);
    console.log(`  Title: "${post.title}"`);
    console.log(`  Category: ${post.category} | Tags: ${post.tags.join(", ")}`);

    const bodyCount = post.images.length;
    const needed = 1 + bodyCount; // hero + body

    // Build ONE query from title + keyword + tags
    const query = buildQuery(post.title, post.primaryKeyword, post.tags);
    if (verbose) console.log(`  Query: "${query}"`);

    const photos = await fetchImagesForPost(query, needed, accessKey, verbose);

    if (photos.length === 0) {
      console.log("  SKIPPED — no results");
      skipped++;
      continue;
    }

    // Distribute: first photo = hero, rest = body
    const newHero = photoToImage(photos[0]);
    trackDownload(photos[0], accessKey);

    const newBody: BlogImage[] = [];
    for (let i = 1; i < Math.min(needed, photos.length); i++) {
      newBody.push(photoToImage(photos[i]));
      trackDownload(photos[i], accessKey);
    }

    // If not enough unique body results, pull from further in the result set
    for (let i = needed; i < photos.length && newBody.length < bodyCount; i++) {
      newBody.push(photoToImage(photos[i]));
      trackDownload(photos[i], accessKey);
    }

    console.log(`  Hero: "${photos[0].alt_description || "(no alt)"}"`);
    newBody.forEach((img, i) => {
      console.log(`  Body[${i}]: "${img.alt}"`);
    });

    // Replace inline images in body
    const newBodyText = replaceInlineImages(post.body, post.images, newBody);

    post.heroImage = newHero;
    post.images = newBody;
    post.body = newBodyText;
    post.updatedAt = new Date().toISOString();

    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify(post, null, 2) + "\n");
      console.log(`  WRITTEN`);
    } else {
      console.log(`  Would write`);
    }

    updated++;

    // 4-second delay between posts to stay well under 50 req/hour
    if (updated < files.length) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Updated: ${updated} | Skipped: ${skipped} | Total: ${files.length}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
