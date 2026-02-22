import fs from "fs";
import path from "path";
import type { BlogPost, BlogPostIndex } from "../../src/lib/blog/types";

const SITE_URL = "https://disposight.com";
const CONTENT_DIR = path.join(process.cwd(), "content");
const BLOG_DIR = path.join(CONTENT_DIR, "blog");
const INDEX_PATH = path.join(CONTENT_DIR, "_system", "contentIndex.json");

function toIndexEntry(post: BlogPost): BlogPostIndex {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    heroImage: post.heroImage,
    readingTime: post.readingTime,
    publishedAt: post.publishedAt,
    isDraft: post.isDraft,
  };
}

/**
 * Ping Google's WebSub (PubSubHubbub) hub to notify of new content.
 * Google's Feedfetcher will re-crawl the RSS feed within minutes.
 */
async function pingWebSub(): Promise<void> {
  try {
    const res = await fetch("https://pubsubhubbub.appspot.com/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "hub.mode": "publish",
        "hub.url": `${SITE_URL}/feed.xml`,
      }),
    });
    if (res.ok || res.status === 204) {
      console.log(`   WebSub pinged — Google will re-crawl RSS feed`);
    } else {
      console.warn(`   WebSub ping returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`   WebSub ping failed: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Ping IndexNow to notify Bing, Yandex, and other participating search engines.
 * Requires INDEXNOW_KEY env var. If not set, skips silently.
 */
async function pingIndexNow(postUrl: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return; // IndexNow not configured — skip

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "disposight.com",
        key,
        urlList: [postUrl],
      }),
    });
    if (res.ok || res.status === 202) {
      console.log(`   IndexNow pinged — Bing/Yandex notified`);
    } else {
      console.warn(`   IndexNow ping returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`   IndexNow ping failed: ${err instanceof Error ? err.message : err}`);
  }
}

export function publishPost(post: BlogPost): void {
  // Ensure directories exist
  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });

  // Write full post JSON
  const postPath = path.join(BLOG_DIR, `${post.slug}.json`);
  fs.writeFileSync(postPath, JSON.stringify(post, null, 2), "utf-8");

  // Read existing index
  let index: BlogPostIndex[] = [];
  try {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    // Start fresh
  }

  // Remove existing entry with same slug (if re-publishing)
  index = index.filter((p) => p.slug !== post.slug);

  // Prepend new entry
  index.unshift(toIndexEntry(post));

  // Write index
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");

  // Notify search engines (fire-and-forget, don't block publish)
  // Skip pings for drafts — don't notify search engines until the post goes live
  if (!post.isDraft) {
    const postUrl = `${SITE_URL}/blog/${post.slug}`;
    Promise.all([
      pingWebSub(),
      pingIndexNow(postUrl),
    ]).catch(() => {}); // Swallow — notifications are best-effort
  }
}

/**
 * Publish an existing draft post by flipping isDraft to false,
 * updating the content index, and pinging search engines.
 */
export function publishDraft(slug: string): void {
  const postPath = path.join(BLOG_DIR, `${slug}.json`);

  if (!fs.existsSync(postPath)) {
    throw new Error(`Post not found: ${postPath}`);
  }

  const post: BlogPost = JSON.parse(fs.readFileSync(postPath, "utf-8"));

  if (!post.isDraft) {
    throw new Error(`Post "${slug}" is already published (isDraft is false).`);
  }

  // Flip draft status and update timestamp
  post.isDraft = false;
  post.updatedAt = new Date().toISOString();

  // Write updated post
  fs.writeFileSync(postPath, JSON.stringify(post, null, 2), "utf-8");

  // Update content index entry
  let index: BlogPostIndex[] = [];
  try {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    // Start fresh
  }

  const existingIdx = index.findIndex((p) => p.slug === slug);
  const indexEntry: BlogPostIndex = {
    slug: post.slug,
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    heroImage: post.heroImage,
    readingTime: post.readingTime,
    publishedAt: post.publishedAt,
    isDraft: false,
  };

  if (existingIdx >= 0) {
    index[existingIdx] = indexEntry;
  } else {
    index.unshift(indexEntry);
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");

  // Now ping search engines since the post is live
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  Promise.all([
    pingWebSub(),
    pingIndexNow(postUrl),
  ]).catch(() => {}); // Swallow — notifications are best-effort
}
