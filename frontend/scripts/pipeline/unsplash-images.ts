export interface UnsplashImage {
  url: string;
  alt: string;
  credit: string;
  themes: string[];
}

export const UNSPLASH_IMAGES: UnsplashImage[] = [
  // Corporate distress / empty offices
  {
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
    alt: "Empty corporate office space",
    credit: "Unsplash",
    themes: ["corporate-distress", "office-equipment"],
  },
  {
    url: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&q=80",
    alt: "Vacant modern office building",
    credit: "Unsplash",
    themes: ["corporate-distress", "business-meeting"],
  },
  {
    url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80",
    alt: "Corporate workspace with documents",
    credit: "Unsplash",
    themes: ["corporate-distress", "data-analytics"],
  },
  {
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80",
    alt: "Corporate skyscraper exterior",
    credit: "Unsplash",
    themes: ["corporate-distress", "distressed-investing"],
  },
  {
    url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
    alt: "Financial documents and calculations",
    credit: "Unsplash",
    themes: ["corporate-distress", "data-analytics"],
  },
  // Factory / warehouse
  {
    url: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=80",
    alt: "Industrial warehouse interior",
    credit: "Unsplash",
    themes: ["factory-warehouse", "equipment-remarketing"],
  },
  {
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80",
    alt: "Warehouse with stacked inventory",
    credit: "Unsplash",
    themes: ["factory-warehouse", "asset-recovery"],
  },
  {
    url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200&q=80",
    alt: "Modern factory production line",
    credit: "Unsplash",
    themes: ["factory-warehouse", "equipment-remarketing"],
  },
  {
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=80",
    alt: "Industrial machinery close-up",
    credit: "Unsplash",
    themes: ["factory-warehouse", "equipment-remarketing"],
  },
  {
    url: "https://images.unsplash.com/photo-1504917595217-d4dc5ede4c78?w=1200&q=80",
    alt: "Shipping containers in logistics yard",
    credit: "Unsplash",
    themes: ["factory-warehouse", "asset-recovery"],
  },
  // Legal / courthouse
  {
    url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80",
    alt: "Courthouse pillars and scales of justice",
    credit: "Unsplash",
    themes: ["legal-courthouse", "bankruptcy-guide"],
  },
  {
    url: "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=1200&q=80",
    alt: "Legal documents and gavel",
    credit: "Unsplash",
    themes: ["legal-courthouse", "bankruptcy-guide"],
  },
  {
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80",
    alt: "Law library with legal volumes",
    credit: "Unsplash",
    themes: ["legal-courthouse", "due-diligence"],
  },
  {
    url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
    alt: "Contract signing on wooden desk",
    credit: "Unsplash",
    themes: ["legal-courthouse", "due-diligence"],
  },
  // Data analytics
  {
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    alt: "Data analytics dashboard on screen",
    credit: "Unsplash",
    themes: ["data-analytics", "industry-analysis"],
  },
  {
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    alt: "Financial charts and market data",
    credit: "Unsplash",
    themes: ["data-analytics", "distressed-investing"],
  },
  {
    url: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&q=80",
    alt: "Business intelligence report on laptop",
    credit: "Unsplash",
    themes: ["data-analytics", "industry-analysis"],
  },
  {
    url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    alt: "Stock market trading screen",
    credit: "Unsplash",
    themes: ["data-analytics", "distressed-investing"],
  },
  // Office equipment
  {
    url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1200&q=80",
    alt: "Server room with network equipment",
    credit: "Unsplash",
    themes: ["office-equipment", "equipment-remarketing"],
  },
  {
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80",
    alt: "Office furniture and computer workstations",
    credit: "Unsplash",
    themes: ["office-equipment", "asset-recovery"],
  },
  {
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80",
    alt: "Conference room with presentation equipment",
    credit: "Unsplash",
    themes: ["office-equipment", "business-meeting"],
  },
  // Business meeting / deal-making
  {
    url: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&q=80",
    alt: "Business professionals in strategy meeting",
    credit: "Unsplash",
    themes: ["business-meeting", "due-diligence"],
  },
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
    alt: "Team analyzing business documents",
    credit: "Unsplash",
    themes: ["business-meeting", "liquidation-strategy"],
  },
  {
    url: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1200&q=80",
    alt: "Handshake sealing a business deal",
    credit: "Unsplash",
    themes: ["business-meeting", "distressed-investing"],
  },
  {
    url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80",
    alt: "Executive boardroom presentation",
    credit: "Unsplash",
    themes: ["business-meeting", "industry-analysis"],
  },
  // Additional industry
  {
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
    alt: "Business person reviewing financial reports",
    credit: "Unsplash",
    themes: ["data-analytics", "due-diligence"],
  },
  {
    url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80",
    alt: "Professional in business attire",
    credit: "Unsplash",
    themes: ["corporate-distress", "business-meeting"],
  },
  {
    url: "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=1200&q=80",
    alt: "Abandoned commercial building",
    credit: "Unsplash",
    themes: ["corporate-distress", "asset-recovery"],
  },
  {
    url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80",
    alt: "Gold bars and financial instruments",
    credit: "Unsplash",
    themes: ["distressed-investing", "asset-recovery"],
  },
  {
    url: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=1200&q=80",
    alt: "Blueprint and construction plans",
    credit: "Unsplash",
    themes: ["due-diligence", "factory-warehouse"],
  },
  {
    url: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1200&q=80",
    alt: "Modern coworking office space",
    credit: "Unsplash",
    themes: ["office-equipment", "corporate-distress"],
  },
  {
    url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80",
    alt: "Business colleagues reviewing a deal",
    credit: "Unsplash",
    themes: ["business-meeting", "liquidation-strategy"],
  },
  {
    url: "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=1200&q=80",
    alt: "Declining financial graph",
    credit: "Unsplash",
    themes: ["data-analytics", "corporate-distress"],
  },
  {
    url: "https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=1200&q=80",
    alt: "Auction house interior",
    credit: "Unsplash",
    themes: ["liquidation-strategy", "asset-recovery"],
  },
  {
    url: "https://images.unsplash.com/photo-1416339442236-8ceb164046f8?w=1200&q=80",
    alt: "Construction equipment on site",
    credit: "Unsplash",
    themes: ["equipment-remarketing", "factory-warehouse"],
  },
  {
    url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80",
    alt: "American flag at government building",
    credit: "Unsplash",
    themes: ["legal-courthouse", "warn-act"],
  },
  {
    url: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=1200&q=80",
    alt: "Document filing system in office",
    credit: "Unsplash",
    themes: ["warn-act", "legal-courthouse"],
  },
  {
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
    alt: "US Capitol building exterior",
    credit: "Unsplash",
    themes: ["warn-act", "legal-courthouse"],
  },
  {
    url: "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=1200&q=80",
    alt: "Industrial plant aerial view",
    credit: "Unsplash",
    themes: ["factory-warehouse", "industry-analysis"],
  },
];

const CATEGORY_THEME_MAP: Record<string, string[]> = {
  "industry-analysis": ["data-analytics", "corporate-distress", "industry-analysis"],
  "asset-recovery": ["factory-warehouse", "asset-recovery", "office-equipment"],
  "bankruptcy-guide": ["legal-courthouse", "bankruptcy-guide", "corporate-distress"],
  "warn-act": ["warn-act", "legal-courthouse", "corporate-distress"],
  "due-diligence": ["due-diligence", "business-meeting", "data-analytics"],
  "liquidation-strategy": ["liquidation-strategy", "factory-warehouse", "business-meeting"],
  "equipment-remarketing": ["equipment-remarketing", "factory-warehouse", "office-equipment"],
  "distressed-investing": ["distressed-investing", "data-analytics", "business-meeting"],
};

export function getImagesForCategory(category: string, count: number): UnsplashImage[] {
  const themes = CATEGORY_THEME_MAP[category] || ["corporate-distress"];

  const scored = UNSPLASH_IMAGES.map((img) => {
    const matchCount = img.themes.filter((t) => themes.includes(t)).length;
    return { img, score: matchCount };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top-scoring, but spread them out to avoid duplicates
  const selected: UnsplashImage[] = [];
  const usedUrls = new Set<string>();

  for (const { img } of scored) {
    if (selected.length >= count) break;
    if (!usedUrls.has(img.url)) {
      selected.push(img);
      usedUrls.add(img.url);
    }
  }

  return selected;
}
