import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { BlogPost, BlogHeading, BlogFAQ, BlogImage, BlogCTA, BlogPostIndex } from "../../src/lib/blog/types";
import type { GenerateResult } from "./generate";
import { PIPELINE_CONFIG } from "./config";
import { getImagesForCategory } from "./unsplash-images";
import { generateHeroImage } from "./generate-hero-image";
import { fetchUnsplashImages } from "./unsplash-api";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractHeadings(body: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(body)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const id = slugify(text);
    headings.push({ level, text, id });
  }

  return headings;
}

function extractExcerpt(body: string, maxLen = 200): string {
  // Strip markdown formatting
  const plain = body
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[IMAGE_\d+\]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= maxLen) return plain;
  const truncated = plain.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLen) + "...";
}

function countWords(body: string): number {
  const plain = body
    .replace(/#{1,6}\s+/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[IMAGE_\d+\]/g, "");
  return plain.split(/\s+/).filter(Boolean).length;
}

function replaceImagePlaceholders(body: string, images: BlogImage[]): string {
  let result = body;
  for (let i = 0; i < images.length; i++) {
    const placeholder = `[IMAGE_${i + 1}]`;
    const img = images[i];
    const markdown = `![${img.alt}](${img.url})\n*Photo: ${img.credit}*`;
    result = result.replace(placeholder, markdown);
  }
  return result;
}

/**
 * Replace the AI-invented Related Reading links with real existing blog posts.
 * Matches by word overlap between post titles and the current post's tags/keyword.
 */
function fixRelatedReadingLinks(body: string, currentSlug: string, tags: string[]): string {
  const indexPath = path.join(process.cwd(), "content", "_system", "contentIndex.json");
  let existingPosts: BlogPostIndex[] = [];
  try {
    existingPosts = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch {
    return body; // No index yet — leave as-is
  }

  // Exclude the current post
  const otherPosts = existingPosts.filter((p) => p.slug !== currentSlug);
  if (otherPosts.length === 0) return body;

  // Score each post by relevance to current post's tags
  const tagWords = new Set(
    tags.flatMap((t) => t.toLowerCase().split(/[\s-]+/)).filter((w) => w.length > 2)
  );

  const scored = otherPosts.map((p) => {
    const titleWords = p.title.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 2);
    const postTags = (p.tags || []).flatMap((t) => t.toLowerCase().split(/[\s-]+/)).filter((w) => w.length > 2);
    const allWords = [...titleWords, ...postTags];
    const overlap = allWords.filter((w) => tagWords.has(w)).length;
    return { post: p, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  const topPosts = scored.slice(0, 4).filter((s) => s.score > 0);

  // If we found fewer than 2 relevant posts, use the most recent ones
  if (topPosts.length < 2) {
    const recent = otherPosts
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 4);
    const recentLinks = recent.map((p) => `- [${p.title}](/blog/${p.slug})`).join("\n");
    return body.replace(
      /## Related Reading[\s\S]*?(?=\n## |\n*$)/,
      `## Related Reading\n${recentLinks}\n`
    );
  }

  const links = topPosts.map((s) => `- [${s.post.title}](/blog/${s.post.slug})`).join("\n");
  return body.replace(
    /## Related Reading[\s\S]*?(?=\n## |\n*$)/,
    `## Related Reading\n${links}\n`
  );
}

function buildDefaultCTA(): BlogCTA {
  return {
    headline: "Stay Ahead of Every Distressed Asset Opportunity",
    description:
      "DispoSight monitors WARN Act filings, bankruptcy courts, SEC filings, and global news — delivering actionable distress signals before your competitors see them.",
    buttonText: "Start Free Trial",
    buttonUrl: "/register",
  };
}

export async function postProcess(
  raw: GenerateResult,
  verbose?: boolean,
  options?: { isDraft?: boolean; companyName?: string }
): Promise<BlogPost> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Count how many body images the article needs (based on [IMAGE_N] placeholders)
  const placeholderMatches = raw.body.match(/\[IMAGE_\d+\]/g);
  const bodyCount = placeholderMatches ? placeholderMatches.length : 0;

  // --- 3-tier image sourcing ---
  // Tier 1: Unsplash API (real photos, topic-relevant)
  const apiResult = await fetchUnsplashImages(
    raw.primaryKeyword,
    raw.category,
    bodyCount,
    verbose,
    options?.companyName,
    raw.title,
    raw.tags
  );

  let heroImage: BlogImage;
  let images: BlogImage[];

  if (apiResult && apiResult.body.length >= bodyCount) {
    // Full API results — use everything from Unsplash API
    heroImage = apiResult.hero;
    images = apiResult.body;
    if (verbose) console.log(`   Image source: Unsplash API (hero + ${images.length} body)`);
  } else if (apiResult) {
    // Partial API results — hero from API, backfill body from hardcoded pool
    heroImage = apiResult.hero;
    const poolImages = getImagesForCategory(raw.category, bodyCount);
    images = [
      ...apiResult.body,
      ...poolImages.slice(apiResult.body.length).map((img) => ({
        url: img.url,
        alt: img.alt,
        credit: img.credit,
      })),
    ].slice(0, bodyCount);
    if (verbose) console.log(`   Image source: Unsplash API (hero) + hardcoded pool (${images.length - apiResult.body.length} backfill)`);
  } else {
    // Tier 2: Full fallback to hardcoded pool
    const poolImages = getImagesForCategory(raw.category, bodyCount + 1);
    heroImage = poolImages[0] ? { url: poolImages[0].url, alt: poolImages[0].alt, credit: poolImages[0].credit } : {
      url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80",
      alt: "Corporate distress intelligence",
      credit: "Unsplash",
    };
    images = poolImages.slice(1, bodyCount + 1).map((img) => ({
      url: img.url,
      alt: img.alt,
      credit: img.credit,
    }));
    if (verbose) console.log(`   Image source: hardcoded pool (hero + ${images.length} body)`);
  }

  // Tier 3: AI hero override (opt-in via config)
  if (PIPELINE_CONFIG.heroImage.enabled) {
    const aiHero = await generateHeroImage(
      slugify(raw.title),
      raw.title,
      raw.description,
      raw.category,
      raw.primaryKeyword,
      raw.tags || [],
      verbose
    );
    if (aiHero) {
      heroImage = aiHero;
      if (verbose) console.log("   Hero override: AI-generated (DALL-E)");
    }
  }

  // Replace image placeholders in body
  let body = replaceImagePlaceholders(raw.body, images);

  // Extract headings
  const headings = extractHeadings(body);

  // Extract FAQs (from the structured array, not body parsing)
  const faqs: BlogFAQ[] = (raw.faqs || []).map((f) => ({
    question: f.question,
    answer: f.answer,
  }));

  // Compute word count and reading time
  const wordCount = countWords(body);
  const readingTime = Math.max(1, Math.ceil(wordCount / 250));

  // Build excerpt
  const excerpt = extractExcerpt(raw.body);

  // Auto-fix title length — trim to last full word within 70 chars
  let title = raw.title;
  if (title.length > 70) {
    title = title.slice(0, 70);
    const lastSpace = title.lastIndexOf(" ");
    if (lastSpace > 40) {
      title = title.slice(0, lastSpace);
    }
  }

  const slug = slugify(title);

  // Replace AI-invented Related Reading links with real existing posts
  body = fixRelatedReadingLinks(body, slug, raw.tags || []);

  // Auto-fix description length
  let description = raw.description;
  if (description.length > 165) {
    description = description.slice(0, 162) + "...";
  }

  return {
    id,
    slug,
    title,
    description,
    excerpt,
    body,
    category: raw.category,
    tags: raw.tags || [],
    primaryKeyword: raw.primaryKeyword,
    author: { ...PIPELINE_CONFIG.author },
    heroImage,
    images,
    headings,
    faqs,
    sources: raw.sources || [],
    cta: buildDefaultCTA(),
    wordCount,
    readingTime,
    publishedAt: now,
    updatedAt: now,
    isDraft: options?.isDraft ?? false,
  };
}
