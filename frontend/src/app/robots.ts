import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/about", "/faq", "/contact", "/login", "/register", "/blog", "/feed.xml"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: "https://disposight.com/sitemap.xml",
  };
}
