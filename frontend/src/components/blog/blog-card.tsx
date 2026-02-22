import Link from "next/link";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import type { BlogPostIndex } from "@/lib/blog/types";

export function BlogCard({ post }: { post: BlogPostIndex }) {
  const categoryInfo = BLOG_CATEGORIES[post.category];
  const date = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-lg overflow-hidden border transition-all duration-300 hover:translate-y-[-2px] hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={post.heroImage.url}
          alt={post.heroImage.alt}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {categoryInfo?.name || post.category}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="text-base font-semibold line-clamp-2 mb-2 group-hover:text-emerald-400 transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {post.title}
        </h3>
        <p
          className="text-sm line-clamp-2 mb-3 flex-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {post.excerpt}
        </p>
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{date}</span>
          <span>{post.readingTime} min read</span>
        </div>
      </div>
    </Link>
  );
}
