import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByCategory, getAllCategories } from "@/lib/blog/data";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import type { BlogCategory } from "@/lib/blog/types";
import { BlogCard } from "@/components/blog/blog-card";

export async function generateStaticParams() {
  return getAllCategories().map(({ category }) => ({ slug: category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryInfo = BLOG_CATEGORIES[slug as BlogCategory];
  if (!categoryInfo) return { title: "Category Not Found" };

  return {
    title: `${categoryInfo.name} Articles`,
    description: categoryInfo.description,
    alternates: {
      canonical: `https://disposight.com/blog/category/${slug}`,
      types: { "application/rss+xml": "https://disposight.com/feed.xml" },
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = slug as BlogCategory;
  const categoryInfo = BLOG_CATEGORIES[category];
  if (!categoryInfo) notFound();

  const posts = getPostsByCategory(category);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <span
          className="inline-block px-3 py-1 text-xs font-medium rounded-full mb-3"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Category
        </span>
        <h1
          className="text-3xl sm:text-4xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {categoryInfo.name}
        </h1>
        <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          {categoryInfo.description}
        </p>
      </div>

      {/* Posts grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "var(--text-secondary)" }}>
            No articles in this category yet.
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Check back soon for new content.
          </p>
        </div>
      )}
    </div>
  );
}
