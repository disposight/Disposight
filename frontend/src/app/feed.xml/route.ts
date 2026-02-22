import { getAllPostsIndex } from "@/lib/blog/data";
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog/types";

const SITE_URL = "https://disposight.com";
const WEBSUB_HUB = "https://pubsubhubbub.appspot.com/";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const posts = getAllPostsIndex();
  const lastBuildDate = posts.length > 0
    ? new Date(posts[0].publishedAt).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`;
      const categoryName = BLOG_CATEGORIES[post.category as BlogCategory]?.name ?? post.category;

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(categoryName)}</category>
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DispoSight Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Corporate distress intelligence — insights on asset recovery, bankruptcy filings, WARN Act signals, and disposition strategies.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <atom:link href="${WEBSUB_HUB}" rel="hub" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
