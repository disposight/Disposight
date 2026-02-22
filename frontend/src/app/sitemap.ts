import type { MetadataRoute } from "next";
import { getAllPostsIndex, getAllCategories } from "@/lib/blog/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://disposight.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: `${base}/pricing`, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/faq`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    { url: `${base}/register`, lastModified: new Date() },
    { url: `${base}/login`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
    { url: `${base}/feed.xml`, lastModified: new Date() },
  ];

  const categories = getAllCategories().map(({ category }) => ({
    url: `${base}/blog/category/${category}`,
    lastModified: new Date(),
  }));

  const posts = getAllPostsIndex().map((post) => {
    const imageUrl = post.heroImage?.url;
    const fullImageUrl = imageUrl?.startsWith("/")
      ? `${base}${imageUrl}`
      : imageUrl;

    return {
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      ...(fullImageUrl ? { images: [fullImageUrl] } : {}),
    };
  });

  return [...staticRoutes, ...categories, ...posts];
}
