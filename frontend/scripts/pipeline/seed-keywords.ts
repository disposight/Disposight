import type { BlogCategory } from "../../src/lib/blog/types";

/**
 * Category-specific seed keywords for DataForSEO.
 * These are high-level terms that generate related keyword suggestions.
 */
const SEED_KEYWORDS: Record<BlogCategory, string[]> = {
  "industry-analysis": [
    "corporate distress signals",
    "company liquidation trends",
    "business closure rates",
    "corporate bankruptcy statistics",
    "distressed company indicators",
    "industry downturn analysis",
    "mass layoff trends",
    "corporate restructuring trends",
  ],
  "asset-recovery": [
    "distressed asset recovery",
    "corporate asset liquidation",
    "surplus equipment buyers",
    "asset recovery process",
    "corporate surplus inventory",
    "business asset auction",
    "commercial equipment salvage",
    "decommissioned assets",
  ],
  "bankruptcy-guide": [
    "chapter 7 bankruptcy assets",
    "chapter 11 restructuring",
    "bankruptcy asset sale",
    "363 sale bankruptcy",
    "bankruptcy trustee assets",
    "corporate bankruptcy filing",
    "bankruptcy auction process",
    "debtor in possession financing",
  ],
  "warn-act": [
    "WARN Act filings",
    "WARN Act notice",
    "plant closing notification",
    "mass layoff notice",
    "WARN Act requirements",
    "60 day layoff notice",
    "state WARN Act laws",
    "WARN Act compliance",
  ],
  "due-diligence": [
    "distressed asset due diligence",
    "asset valuation distressed",
    "acquisition due diligence checklist",
    "equipment appraisal liquidation",
    "corporate distress evaluation",
    "deal evaluation framework",
    "distressed acquisition risks",
    "fair market value distressed assets",
  ],
  "liquidation-strategy": [
    "corporate liquidation strategy",
    "asset liquidation timeline",
    "liquidation auction strategy",
    "orderly liquidation value",
    "forced liquidation value",
    "liquidation channel optimization",
    "bulk asset sales strategy",
    "going concern vs liquidation",
  ],
  "equipment-remarketing": [
    "equipment remarketing",
    "used corporate equipment",
    "IT asset disposition",
    "commercial equipment resale",
    "industrial equipment remarketing",
    "office equipment liquidation",
    "data center decommission",
    "heavy equipment resale value",
  ],
  "distressed-investing": [
    "distressed debt investing",
    "distressed asset investment",
    "vulture investing strategy",
    "special situations investing",
    "distressed PE opportunities",
    "non-performing loan acquisition",
    "corporate turnaround investing",
    "distressed real estate opportunities",
  ],
};

export function getSeedKeywords(category: BlogCategory): string[] {
  return SEED_KEYWORDS[category] || SEED_KEYWORDS["industry-analysis"];
}

export function getAllSeedKeywords(): Record<BlogCategory, string[]> {
  return SEED_KEYWORDS;
}
