/**
 * Generate 10 SEO-validated blog posts through the proper pipeline:
 * 1. Run --discover on all 8 categories (DataForSEO keyword research + scoring)
 * 2. Rank all ideas across categories by opportunity score
 * 3. Generate the top 10 (dedup check, OpenAI generation, Unsplash images, validation)
 *
 * Usage: npx tsx scripts/generate-seo-batch.ts [--dry-run] [--verbose]
 */

import { execSync } from "child_process";

const CATEGORIES = [
  "warn-act",
  "bankruptcy-guide",
  "industry-analysis",
  "asset-recovery",
  "due-diligence",
  "liquidation-strategy",
  "equipment-remarketing",
  "distressed-investing",
];

const TARGET_POSTS = 10;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");

function runPipeline(pipelineArgs: string): string {
  const flags = [
    verbose ? "--verbose" : "",
    dryRun ? "--dry-run" : "",
  ].filter(Boolean).join(" ");

  const cmd = `npm run pipeline -- ${pipelineArgs} ${flags}`;
  console.log(`\n$ ${cmd}\n`);

  try {
    const output = execSync(cmd, {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 300000, // 5 min per run
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    // Pipeline might exit non-zero on validation failures — still capture output
    const output = (execErr.stdout || "") + (execErr.stderr || "");
    console.log(output.slice(-500));
    return output;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("  DispoSight SEO Blog Generation — Full Pipeline");
  console.log("=".repeat(60));
  console.log(`Target: ${TARGET_POSTS} posts across ${CATEGORIES.length} categories`);
  if (dryRun) console.log("MODE: DRY RUN — posts will not be published");
  console.log();

  // Distribute posts: 1 per category (8), then 2 extra from best categories
  // The --auto mode handles: discover → DataForSEO scoring → pick best → generate → validate → publish
  let totalGenerated = 0;
  let totalFailed = 0;
  const categoryResults: { category: string; success: boolean; keyword?: string }[] = [];

  // Phase 1: One post per category (8 posts)
  console.log("=".repeat(60));
  console.log("  PHASE 1: One post per category");
  console.log("=".repeat(60));

  for (const category of CATEGORIES) {
    if (totalGenerated >= TARGET_POSTS) break;

    console.log(`\n${"─".repeat(50)}`);
    console.log(`Category: ${category} (${totalGenerated + 1}/${TARGET_POSTS})`);
    console.log("─".repeat(50));

    const output = runPipeline(`--auto --category ${category} --count 1`);

    // Check if it generated successfully
    const publishMatch = output.match(/Published to: content\/blog\/(.+?)\.json/);
    const dryRunMatch = output.match(/Skipping publish \(dry run\)/);
    const duplicateMatch = output.match(/DUPLICATE DETECTED/);
    const noIdeasMatch = output.match(/No ideas scored above/);
    const validationFail = output.match(/VALIDATION FAILED/);

    if (publishMatch || dryRunMatch) {
      totalGenerated++;
      const keyword = output.match(/Generating 1\/1: "(.+?)"/)?.[1] || "unknown";
      categoryResults.push({ category, success: true, keyword });
      console.log(`\n  ✓ Post ${totalGenerated}/${TARGET_POSTS} generated: "${keyword}"`);
    } else if (duplicateMatch) {
      console.log("\n  ⚠ Skipped — duplicate of existing post");
      categoryResults.push({ category, success: false, keyword: "duplicate" });
      totalFailed++;
    } else if (noIdeasMatch) {
      console.log("\n  ⚠ No ideas above threshold for this category");
      categoryResults.push({ category, success: false, keyword: "no ideas" });
      totalFailed++;
    } else if (validationFail) {
      console.log("\n  ⚠ Generated but failed validation");
      categoryResults.push({ category, success: false, keyword: "validation fail" });
      totalFailed++;
    } else {
      console.log("\n  ⚠ Unknown result");
      categoryResults.push({ category, success: false, keyword: "unknown" });
      totalFailed++;
    }

    // Brief pause between runs to be nice to APIs
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Phase 2: Fill remaining slots from categories with best potential
  if (totalGenerated < TARGET_POSTS) {
    const remaining = TARGET_POSTS - totalGenerated;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  PHASE 2: ${remaining} more posts from best categories`);
    console.log("=".repeat(60));

    // Try categories that succeeded in phase 1 (they have proven search demand)
    const successCategories = categoryResults
      .filter((r) => r.success)
      .map((r) => r.category);

    // Also try categories that failed (might have different ideas now)
    const allCategories = [...successCategories, ...CATEGORIES.filter((c) => !successCategories.includes(c))];

    for (const category of allCategories) {
      if (totalGenerated >= TARGET_POSTS) break;

      console.log(`\n${"─".repeat(50)}`);
      console.log(`Category: ${category} (${totalGenerated + 1}/${TARGET_POSTS})`);
      console.log("─".repeat(50));

      const output = runPipeline(`--auto --category ${category} --count 1`);

      const publishMatch = output.match(/Published to: content\/blog\/(.+?)\.json/);
      const dryRunMatch = output.match(/Skipping publish \(dry run\)/);

      if (publishMatch || dryRunMatch) {
        totalGenerated++;
        const keyword = output.match(/Generating 1\/1: "(.+?)"/)?.[1] || "unknown";
        console.log(`  ✓ Post ${totalGenerated}/${TARGET_POSTS} generated: "${keyword}"`);
      } else {
        console.log("  ⚠ Skipped");
      }

      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`Generated: ${totalGenerated}/${TARGET_POSTS}`);
  console.log(`Failed/Skipped: ${totalFailed}`);
  console.log();
  categoryResults.forEach((r) => {
    const icon = r.success ? "✓" : "✗";
    console.log(`  ${icon} ${r.category}: ${r.keyword}`);
  });
  console.log();
}

main().catch((err) => {
  console.error("Batch generation failed:", err);
  process.exit(1);
});
