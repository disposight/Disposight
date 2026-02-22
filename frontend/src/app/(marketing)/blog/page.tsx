import type { Metadata } from "next";
import Link from "next/link";
import { getPaginatedPosts, getAllCategories } from "@/lib/blog/data";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import type { BlogCategory } from "@/lib/blog/types";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogPagination } from "@/components/blog/blog-pagination";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Expert analysis on corporate distress signals, asset disposition opportunities, bankruptcy proceedings, and deal evaluation frameworks for liquidation firms and distressed investors.",
  openGraph: {
    title: "DispoSight Blog — Distress Intelligence Insights",
    description:
      "Expert analysis on corporate distress signals, asset disposition, bankruptcy, and deal evaluation for liquidation firms and distressed investors.",
    type: "website",
    url: "https://disposight.com/blog",
  },
  alternates: {
    canonical: "https://disposight.com/blog",
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const categoryFilter = params.category as BlogCategory | undefined;

  const { posts, totalPages, currentPage } = getPaginatedPosts(page, categoryFilter);
  const categories = getAllCategories();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <ScrollReveal>
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Distress Intelligence Insights
          </h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Expert analysis on corporate distress signals, asset disposition opportunities, bankruptcy
            proceedings, and deal evaluation frameworks.
          </p>
        </div>
      </ScrollReveal>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <Link
              href="/blog"
              className="px-3 py-1.5 text-xs rounded-full border transition-colors"
              style={{
                borderColor: !categoryFilter ? "var(--accent)" : "var(--border-default)",
                color: !categoryFilter ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: !categoryFilter ? 600 : 400,
              }}
            >
              All
            </Link>
            {categories.map(({ category }) => (
              <Link
                key={category}
                href={`/blog?category=${category}`}
                className="px-3 py-1.5 text-xs rounded-full border transition-colors"
                style={{
                  borderColor: categoryFilter === category ? "var(--accent)" : "var(--border-default)",
                  color: categoryFilter === category ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: categoryFilter === category ? 600 : 400,
                }}
              >
                {BLOG_CATEGORIES[category]?.name || category}
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Posts grid */}
      {posts.length > 0 ? (
        <ScrollReveal stagger={100}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div key={post.slug} className="sr-item">
                <BlogCard post={post} />
              </div>
            ))}
          </div>
        </ScrollReveal>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "var(--text-secondary)" }}>
            No articles yet.
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Check back soon for distress intelligence insights.
          </p>
        </div>
      )}

      <BlogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        category={categoryFilter}
      />
    </div>
  );
}
