export interface BlogImage {
  url: string;
  alt: string;
  credit: string;
}

export interface BlogHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

export interface BlogFAQ {
  question: string;
  answer: string;
}

export interface BlogSource {
  title: string;
  url: string;
}

export interface BlogCTA {
  headline: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  tags: string[];
  primaryKeyword: string;
  author: {
    name: string;
    role: string;
    bio: string;
  };
  heroImage: BlogImage;
  images: BlogImage[];
  headings: BlogHeading[];
  faqs: BlogFAQ[];
  sources: BlogSource[];
  cta: BlogCTA;
  wordCount: number;
  readingTime: number;
  publishedAt: string;
  updatedAt: string;
  isDraft: boolean;
}

export interface BlogPostIndex {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  heroImage: BlogImage;
  readingTime: number;
  publishedAt: string;
  isDraft: boolean;
}

export type BlogCategory =
  | "industry-analysis"
  | "asset-recovery"
  | "bankruptcy-guide"
  | "warn-act"
  | "due-diligence"
  | "liquidation-strategy"
  | "equipment-remarketing"
  | "distressed-investing";

export const BLOG_CATEGORIES: Record<BlogCategory, { name: string; description: string }> = {
  "industry-analysis": {
    name: "Industry Analysis",
    description: "Market trends, sector insights, and distress pattern analysis across industries.",
  },
  "asset-recovery": {
    name: "Asset Recovery",
    description: "Strategies and best practices for recovering value from distressed corporate assets.",
  },
  "bankruptcy-guide": {
    name: "Bankruptcy Guide",
    description: "Understanding Chapter 7, Chapter 11, and bankruptcy proceedings for asset buyers.",
  },
  "warn-act": {
    name: "WARN Act",
    description: "How WARN Act filings signal upcoming asset disposition opportunities.",
  },
  "due-diligence": {
    name: "Due Diligence",
    description: "Frameworks and checklists for evaluating distressed asset deals.",
  },
  "liquidation-strategy": {
    name: "Liquidation Strategy",
    description: "Approaches to liquidation timing, pricing, and channel optimization.",
  },
  "equipment-remarketing": {
    name: "Equipment Remarketing",
    description: "Guides for remarketing corporate equipment, machinery, and IT assets.",
  },
  "distressed-investing": {
    name: "Distressed Investing",
    description: "Investment strategies for distressed debt, equity, and asset portfolios.",
  },
};

export const POSTS_PER_PAGE = 9;
