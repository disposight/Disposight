import fs from "fs";
import path from "path";
import type { BlogPost, BlogPostIndex } from "../../src/lib/blog/types";
import { PIPELINE_CONFIG } from "./config";
import { loadExistingFingerprints, checkDuplicate } from "./dedup";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePost(
  post: BlogPost,
  options?: { isClosure?: boolean }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = options?.isClosure
    ? PIPELINE_CONFIG.closureContent
    : PIPELINE_CONFIG.content;

  // Required fields
  if (!post.id) errors.push("Missing id");
  if (!post.slug) errors.push("Missing slug");
  if (!post.title) errors.push("Missing title");
  if (!post.description) errors.push("Missing description");
  if (!post.body) errors.push("Missing body");
  if (!post.category) errors.push("Missing category");
  if (!post.primaryKeyword) errors.push("Missing primaryKeyword");
  if (!post.heroImage?.url) errors.push("Missing heroImage URL");

  // Title length
  if (post.title && post.title.length > content.maxTitleLength) {
    errors.push(`Title too long: ${post.title.length} chars (max ${content.maxTitleLength})`);
  }

  // Description length
  if (post.description) {
    if (post.description.length < content.descriptionMinLength) {
      errors.push(
        `Description too short: ${post.description.length} chars (min ${content.descriptionMinLength})`
      );
    }
    if (post.description.length > content.descriptionMaxLength) {
      errors.push(
        `Description too long: ${post.description.length} chars (max ${content.descriptionMaxLength})`
      );
    }
  }

  // Word count
  if (post.wordCount < content.minWordCount) {
    errors.push(`Word count too low: ${post.wordCount} (min ${content.minWordCount})`);
  }

  // FAQs
  if (!post.faqs || post.faqs.length < content.minFaqs) {
    errors.push(`Not enough FAQs: ${post.faqs?.length || 0} (min ${content.minFaqs})`);
  }

  // Headings
  if (!post.headings || post.headings.length < content.minHeadings) {
    errors.push(`Not enough headings: ${post.headings?.length || 0} (min ${content.minHeadings})`);
  }

  // Keyword in title and description
  if (post.primaryKeyword && post.title) {
    if (!post.title.toLowerCase().includes(post.primaryKeyword.toLowerCase())) {
      warnings.push("Primary keyword not found in title");
    }
  }
  if (post.primaryKeyword && post.description) {
    if (!post.description.toLowerCase().includes(post.primaryKeyword.toLowerCase())) {
      warnings.push("Primary keyword not found in description");
    }
  }

  // No unresolved image placeholders
  if (post.body && /\[IMAGE_\d+\]/.test(post.body)) {
    errors.push("Unresolved [IMAGE_N] placeholders in body");
  }

  // Check for duplicate slug
  const indexPath = path.join(process.cwd(), "content", "_system", "contentIndex.json");
  try {
    const existing: BlogPostIndex[] = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    if (existing.some((p) => p.slug === post.slug)) {
      errors.push(`Duplicate slug: "${post.slug}" already exists in index`);
    }
  } catch {
    // Index file doesn't exist yet — that's fine
  }

  // Check for topic overlap with existing posts (keyword + title similarity)
  const fingerprints = loadExistingFingerprints();
  if (fingerprints.length > 0 && post.primaryKeyword) {
    const dupCheck = checkDuplicate(post.primaryKeyword, fingerprints, 0.5);
    if (dupCheck.isDuplicate && dupCheck.closestMatch) {
      errors.push(
        `Topic duplicate: "${post.primaryKeyword}" overlaps with existing post "${dupCheck.closestMatch.title}" (${Math.round(dupCheck.closestMatch.similarity * 100)}% match — ${dupCheck.reason})`
      );
    } else if (dupCheck.closestMatch && dupCheck.closestMatch.similarity >= 0.35) {
      warnings.push(
        `Similar topic: ${Math.round(dupCheck.closestMatch.similarity * 100)}% overlap with "${dupCheck.closestMatch.title}"`
      );
    }
  }

  // Valid hero image URL (HTTPS or local /blog/images/ path)
  if (post.heroImage?.url) {
    const isValidUrl =
      post.heroImage.url.startsWith("https://") ||
      post.heroImage.url.startsWith("/blog/images/");
    if (!isValidUrl) {
      errors.push("Hero image URL must be HTTPS or a local /blog/images/ path");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// CLI entry point for standalone validation
if (process.argv[1]?.endsWith("validate.ts") || process.argv[1]?.endsWith("validate.js")) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run pipeline:validate <slug>");
    process.exit(1);
  }

  const postPath = path.join(process.cwd(), "content", "blog", `${slug}.json`);
  if (!fs.existsSync(postPath)) {
    console.error(`Post not found: ${postPath}`);
    process.exit(1);
  }

  const post: BlogPost = JSON.parse(fs.readFileSync(postPath, "utf-8"));
  const result = validatePost(post);

  if (result.errors.length > 0) {
    console.error("ERRORS:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
  }
  if (result.warnings.length > 0) {
    console.warn("WARNINGS:");
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }
  if (result.valid) {
    console.log("Post is valid.");
  } else {
    process.exit(1);
  }
}
