import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getAllSlugs, getRelatedPosts } from "@/lib/blog/data";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import { ReadingProgressBar } from "@/components/blog/reading-progress-bar";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { MarkdownRenderer } from "@/components/blog/markdown-renderer";
import { SchemaMarkup } from "@/components/blog/schema-markup";
import { AuthorSection } from "@/components/blog/author-section";
import { SourcesSection } from "@/components/blog/sources-section";
import { CTABlock } from "@/components/blog/cta-block";
import { ScrollToTop } from "@/components/blog/scroll-to-top";
import { BlogCard } from "@/components/blog/blog-card";
import { ScrollReveal } from "@/components/scroll-reveal";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [{
        url: post.heroImage.url.startsWith("/")
          ? `https://disposight.com${post.heroImage.url}`
          : post.heroImage.url,
        alt: post.heroImage.alt,
      }],
      url: `https://disposight.com/blog/${post.slug}`,
    },
    alternates: {
      canonical: `https://disposight.com/blog/${post.slug}`,
      types: { "application/rss+xml": "https://disposight.com/feed.xml" },
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const categoryInfo = BLOG_CATEGORIES[post.category];
  const date = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <SchemaMarkup post={post} />
      <ReadingProgressBar />

      <article className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <ScrollReveal>
          <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "var(--text-muted)" }}>
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-emerald-400 transition-colors">
              Blog
            </Link>
            <span>/</span>
            <Link
              href={`/blog/category/${post.category}`}
              className="hover:text-emerald-400 transition-colors"
            >
              {categoryInfo?.name || post.category}
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>
              {post.title}
            </span>
          </nav>
        </ScrollReveal>

        {/* Hero image */}
        <ScrollReveal>
          <div className="relative aspect-[21/9] rounded-lg overflow-hidden mb-8">
            <img
              src={post.heroImage.url}
              alt={post.heroImage.alt}
              className="w-full h-full object-cover"
            />
          </div>
        </ScrollReveal>

        {/* Title + meta */}
        <ScrollReveal>
          <div className="mb-8">
            <span
              className="inline-block px-2.5 py-1 text-xs font-medium rounded mb-3"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {categoryInfo?.name || post.category}
            </span>
            <h1
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
              <span>{post.author.name}</span>
              <span>|</span>
              <span>{date}</span>
              <span>|</span>
              <span>{post.readingTime} min read</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Two-column layout */}
        <div className="flex gap-10">
          {/* TOC sidebar (hidden on mobile) */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <TableOfContents headings={post.headings} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <MarkdownRenderer content={post.body} />
            <ScrollReveal>
              <CTABlock cta={post.cta} />
            </ScrollReveal>
            <ScrollReveal>
              <SourcesSection sources={post.sources} />
            </ScrollReveal>
            <ScrollReveal>
              <AuthorSection author={post.author} />
            </ScrollReveal>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <ScrollReveal stagger={120}>
            <div className="mt-16">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--text-primary)" }}
              >
                Related Articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((r) => (
                  <div key={r.slug} className="sr-item">
                    <BlogCard post={r} />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}
      </article>

      <ScrollToTop />
    </>
  );
}
