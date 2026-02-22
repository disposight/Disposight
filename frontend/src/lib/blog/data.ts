import fs from "fs";
import path from "path";
import type { BlogPost, BlogPostIndex, BlogCategory, BLOG_CATEGORIES } from "./types";
import { POSTS_PER_PAGE } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const BLOG_DIR = path.join(CONTENT_DIR, "blog");
const INDEX_PATH = path.join(CONTENT_DIR, "_system", "contentIndex.json");

function readIndex(): BlogPostIndex[] {
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    return JSON.parse(raw) as BlogPostIndex[];
  } catch {
    return [];
  }
}

export function getAllPostsIndex(): BlogPostIndex[] {
  return readIndex()
    .filter((p) => !p.isDraft)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as BlogPost;
  } catch {
    return null;
  }
}

export function getPostsByCategory(category: BlogCategory): BlogPostIndex[] {
  return getAllPostsIndex().filter((p) => p.category === category);
}

export function getPaginatedPosts(
  page: number,
  category?: BlogCategory
): { posts: BlogPostIndex[]; totalPages: number; currentPage: number } {
  const all = category ? getPostsByCategory(category) : getAllPostsIndex();
  const totalPages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const posts = all.slice(start, start + POSTS_PER_PAGE);
  return { posts, totalPages, currentPage };
}

export function getAllSlugs(): string[] {
  return getAllPostsIndex().map((p) => p.slug);
}

export function getAllCategories(): { category: BlogCategory; count: number }[] {
  const index = getAllPostsIndex();
  const counts = new Map<BlogCategory, number>();
  for (const post of index) {
    counts.set(post.category, (counts.get(post.category) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}

export function getRelatedPosts(slug: string, limit = 3): BlogPostIndex[] {
  const post = getPostBySlug(slug);
  if (!post) return [];

  const all = getAllPostsIndex().filter((p) => p.slug !== slug);

  const scored = all.map((p) => {
    let score = 0;
    if (p.category === post.category) score += 10;
    const sharedTags = p.tags.filter((t) => post.tags.includes(t)).length;
    score += sharedTags * 3;
    return { post: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}
