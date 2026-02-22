import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { PIPELINE_CONFIG } from "./config";
import type { BlogCategory } from "../../src/lib/blog/types";
import type { BlogImage } from "../../src/lib/blog/types";

const BASE_STYLE = [
  "Dark abstract editorial illustration.",
  "Near-black background (#0a0a0a).",
  "Emerald and teal accent colors (#10b981, #14b8a6).",
  "Abstract geometric composition with subtle data visualization motifs.",
  "No human faces. No readable text. No photorealism.",
  "Clean editorial design suitable for a business intelligence platform.",
].join(" ");

const CATEGORY_MOTIFS: Record<BlogCategory, string> = {
  "warn-act":
    "Alert signal patterns radiating outward, layered corporate silhouette forms fading and dissolving, warning beacon geometry.",
  "bankruptcy-guide":
    "Fractured corporate structure diagrams, crumbling geometric blocks, legal document grid patterns breaking apart.",
  "industry-analysis":
    "Data stream flows, interconnected node networks, layered market trend lines, analytical grid overlays.",
  "asset-recovery":
    "Salvage geometry — scattered asset icons reconverging into organized grids, recovery arc patterns.",
  "due-diligence":
    "Magnifying lens geometry over layered data planes, checklist grid patterns, forensic analysis motifs.",
  "liquidation-strategy":
    "Cascading price waterfall patterns, auction gavel geometry, dissolving inventory grids.",
  "equipment-remarketing":
    "Industrial equipment silhouettes as abstract wireframes, remarketing flow arrows, value chain diagrams.",
  "distressed-investing":
    "Distressed debt curve visualizations, contrarian opportunity patterns, risk-reward gradient fields.",
};

function buildPrompt(
  title: string,
  description: string,
  category: BlogCategory,
  primaryKeyword: string,
  tags: string[]
): string {
  const motif = CATEGORY_MOTIFS[category] || CATEGORY_MOTIFS["industry-analysis"];
  const topicContext = [
    `Article title: "${title}".`,
    `Summary: ${description}`,
    `Key themes: ${[primaryKeyword, ...tags.slice(0, 5)].join(", ")}.`,
  ].join(" ");

  return [
    BASE_STYLE,
    motif,
    topicContext,
    "Visually represent the specific subject matter through abstract symbolism.",
    "Wide cinematic aspect ratio. Minimal, sophisticated, Bloomberg Businessweek editorial aesthetic.",
  ].join(" ");
}

export async function generateHeroImage(
  slug: string,
  title: string,
  description: string,
  category: BlogCategory,
  primaryKeyword: string,
  tags: string[],
  verbose?: boolean
): Promise<BlogImage | null> {
  // Check if AI hero generation is enabled
  const config = PIPELINE_CONFIG.heroImage;
  if (!config.enabled) {
    if (verbose) console.log("   Hero image generation disabled in config.");
    return null;
  }

  // Graceful skip if no API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (verbose) console.log("   No OPENAI_API_KEY — skipping AI hero image.");
    return null;
  }

  const prompt = buildPrompt(title, description, category, primaryKeyword, tags);
  if (verbose) {
    console.log(`   DALL-E prompt: ${prompt.slice(0, 120)}...`);
  }

  try {
    const openai = new OpenAI({ apiKey });

    console.log("   Generating AI hero image...");
    const response = await openai.images.generate({
      model: config.model,
      prompt,
      n: 1,
      size: config.size as "1536x1024",
      quality: config.quality as "low" | "medium" | "high",
    });

    const b64Data = response.data?.[0]?.b64_json;
    if (!b64Data) {
      console.warn("   DALL-E returned no image data — falling back to Unsplash.");
      return null;
    }

    // Save to public/blog/images/
    const imagesDir = path.join(process.cwd(), "public", "blog", "images");
    fs.mkdirSync(imagesDir, { recursive: true });

    const filename = `${slug}-hero.png`;
    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, Buffer.from(b64Data, "base64"));

    const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
    console.log(`   Saved hero image: public/blog/images/${filename} (${sizeKB} KB)`);

    return {
      url: `/blog/images/${filename}`,
      alt: `${title} — editorial illustration`,
      credit: "DispoSight",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`   AI hero image failed: ${message} — falling back to Unsplash.`);
    return null;
  }
}
