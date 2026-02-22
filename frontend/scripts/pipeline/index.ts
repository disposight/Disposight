import { generatePost } from "./generate";
import { generateClosurePost } from "./generate-closure";
import { postProcess } from "./post-process";
import { validatePost } from "./validate";
import { publishPost, publishDraft } from "./publish";
import { discoverAndScoreIdeas, formatScoredIdeas, computeOpportunityScore } from "./ideation";
import { getRelatedQuestions, researchClosure } from "./research";
import { fetchKeywordVolumes } from "./dataforseo";
import { PIPELINE_CONFIG } from "./config";
import type { BlogCategory } from "../../src/lib/blog/types";
import { BLOG_CATEGORIES } from "../../src/lib/blog/types";
import type { ScoredIdea } from "./ideation";
import { loadExistingFingerprints, checkDuplicate } from "./dedup";

interface PipelineArgs {
  mode: "generate" | "discover" | "auto";
  topic: string;
  category?: BlogCategory;
  dryRun: boolean;
  verbose: boolean;
  top: number;
  count: number; // how many posts to auto-generate
  skipValidation: boolean; // skip DataForSEO check on manual topics
  closure: string; // company name for closure mode
  publishDraft: string; // slug for publish-draft mode
}

function parseArgs(): PipelineArgs {
  const args = process.argv.slice(2);
  let mode: "generate" | "discover" | "auto" = "generate";
  let topic = "";
  let category: BlogCategory | undefined;
  let dryRun = false;
  let verbose = false;
  let top = 20;
  let count = 1;
  let skipValidation = false;
  let closure = "";
  let publishDraftSlug = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--discover":
        mode = "discover";
        break;
      case "--auto":
        mode = "auto";
        break;
      case "--topic":
        topic = args[++i] || "";
        break;
      case "--category":
        category = args[++i] as BlogCategory;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      case "--top":
        top = parseInt(args[++i] || "20", 10);
        break;
      case "--count":
        count = parseInt(args[++i] || "1", 10);
        break;
      case "--skip-validation":
        skipValidation = true;
        break;
      case "--closure":
        closure = args[++i] || "";
        break;
      case "--publish-draft":
        publishDraftSlug = args[++i] || "";
        break;
    }
  }

  // Closure and publish-draft modes bypass the normal mode/topic requirement
  if (!closure && !publishDraftSlug) {
    if (mode === "generate" && !topic) {
      console.error(`Usage:
  Generate:       npm run pipeline -- --topic "Your topic" [--category warn-act] [--dry-run] [--verbose] [--skip-validation]
  Discover:       npm run pipeline -- --discover --category warn-act [--top 20] [--verbose]
  Auto:           npm run pipeline -- --auto --category warn-act [--count 1] [--dry-run] [--verbose]
  Closure:        npm run pipeline -- --closure "Company Name" [--category liquidation-strategy] [--dry-run] [--verbose]
  Publish Draft:  npm run pipeline -- --publish-draft <slug>

  Closure mode generates a fast-turnaround news-style post saved as a draft.
  Publish Draft flips a draft to live and pings search engines.`);
      process.exit(1);
    }

    if ((mode === "discover" || mode === "auto") && !category) {
      console.error(
        `--discover and --auto require --category. Options: ${Object.keys(BLOG_CATEGORIES).join(", ")}`
      );
      process.exit(1);
    }
  }

  return { mode, topic, category, dryRun, verbose, top, count, skipValidation, closure, publishDraft: publishDraftSlug };
}

// --- Shared FAQ merge helper ---

function mergeFaqs(
  existing: { question: string; answer: string }[],
  incoming: { question: string; answer: string }[]
): { merged: number; skipped: number } {
  const existingQuestions = existing.map((f) => f.question.toLowerCase());
  let merged = 0;
  let skipped = 0;

  for (const faq of incoming) {
    // Strip [Source: ...] from answer text
    const cleanAnswer = faq.answer
      .replace(/\s*\[Source:\s*https?:\/\/[^\]]+\]/gi, "")
      .replace(/\s*\(Source:\s*https?:\/\/[^\)]+\)/gi, "")
      .trim();

    // Fuzzy dedup: check word overlap with existing questions
    const newWords = new Set(
      faq.question
        .toLowerCase()
        .replace(/[?.,!]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    const isDuplicate = existingQuestions.some((eq) => {
      const existingWords = new Set(
        eq.replace(/[?.,!]/g, "").split(/\s+/).filter((w) => w.length > 2)
      );
      const overlap = [...newWords].filter((w) => existingWords.has(w)).length;
      const similarity = overlap / Math.max(newWords.size, existingWords.size);
      return similarity >= 0.6;
    });

    if (!isDuplicate) {
      existing.push({ question: faq.question, answer: cleanAnswer });
      existingQuestions.push(faq.question.toLowerCase());
      merged++;
    } else {
      skipped++;
    }
  }

  return { merged, skipped };
}

// --- Discover mode ---

async function runDiscover(args: PipelineArgs) {
  console.log(`\n--- DispoSight Content Discovery ---`);
  console.log(`Category: ${BLOG_CATEGORIES[args.category!]?.name || args.category}`);
  console.log();

  const scored = await discoverAndScoreIdeas(args.category!, args.verbose);

  console.log(formatScoredIdeas(scored, args.top));
  console.log(`\nTotal ideas scored: ${scored.length}`);

  const minScore = PIPELINE_CONFIG.scoring.minOpportunityScore;
  const qualified = scored.filter((s) => s.score >= minScore);
  console.log(`Ideas above threshold (${minScore}): ${qualified.length}`);

  if (qualified.length > 0) {
    console.log(`\nTop idea: "${qualified[0].keyword}" (score: ${qualified[0].score})`);
    console.log(`  npm run pipeline -- --topic "${qualified[0].keyword}" --category ${args.category}`);
    console.log(`\nOr auto-generate the top idea:`);
    console.log(`  npm run pipeline -- --auto --category ${args.category}`);
  } else {
    console.log(`\nNo ideas scored above ${minScore}. Consider a different category or manual topic.`);
  }

  console.log();
}

// --- DataForSEO sanity check ---

/** Quick DataForSEO check on a manual topic — warns but doesn't block */
async function sanityCheckTopic(
  topic: string,
  verbose: boolean
): Promise<{ score: number; volume: number; kd: number } | null> {
  console.log("   Running DataForSEO sanity check...");
  try {
    // Extract a primary keyword: use the topic as-is and also a shortened version
    const keywords = [topic.toLowerCase()];

    // Also try a shorter extracted keyword (first 4-6 meaningful words)
    const shortened = topic
      .replace(/^(how to|the complete guide to|a guide to|what|why|when|where)\s+/i, "")
      .split(/\s+/)
      .slice(0, 5)
      .join(" ")
      .toLowerCase();
    if (shortened !== keywords[0] && shortened.length > 10) {
      keywords.push(shortened);
    }

    const results = await fetchKeywordVolumes(keywords, verbose);
    if (results.length === 0) {
      console.log("   No DataForSEO data found for this topic (niche keyword).");
      return null;
    }

    // Pick the result with the highest volume
    const best = results.reduce((a, b) => (a.searchVolume > b.searchVolume ? a : b));
    const kd = best.keywordDifficulty;
    const vol = best.searchVolume;
    const paaCount = best.serpFeatures.filter((f) => f === "people_also_ask").length;

    const { score } = computeOpportunityScore(
      vol,
      kd,
      best.serpFeatures,
      paaCount,
      keywords[0],
      5, // default relevance for sanity check
      vol > 0 ? "dataforseo" : "none"
    );

    return { score, volume: vol, kd };
  } catch (err) {
    console.log(`   DataForSEO check skipped: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// --- Generate mode (evergreen) ---

async function runGenerate(args: PipelineArgs, ideaContext?: ScoredIdea) {
  console.log(`\n--- DispoSight Content Pipeline ---`);
  console.log(`Topic: "${args.topic}"`);
  if (args.category) console.log(`Category: ${args.category}`);
  if (args.dryRun) console.log(`Mode: DRY RUN (will not publish)`);

  // Early duplicate check — avoid wasting API calls on topics we already cover
  const fingerprints = loadExistingFingerprints();
  if (fingerprints.length > 0) {
    const dupCheck = checkDuplicate(args.topic, fingerprints);
    if (dupCheck.isDuplicate && dupCheck.closestMatch) {
      console.error(
        `\n   DUPLICATE DETECTED: "${args.topic}" overlaps with existing post:`
      );
      console.error(
        `   → "${dupCheck.closestMatch.title}" (${Math.round(dupCheck.closestMatch.similarity * 100)}% match)`
      );
      console.error(`   Reason: ${dupCheck.reason}`);
      console.error(`   Skipping to avoid duplicate content.\n`);
      return false;
    } else if (dupCheck.closestMatch && dupCheck.closestMatch.similarity >= 0.3) {
      console.log(
        `   Similar existing post: "${dupCheck.closestMatch.title}" (${Math.round(dupCheck.closestMatch.similarity * 100)}% overlap)`
      );
      console.log(`   Proceeding — overlap is below duplicate threshold.`);
    }
  }

  // DataForSEO sanity check for manual topics (skip if already validated via --auto)
  if (!ideaContext && !args.skipValidation) {
    const check = await sanityCheckTopic(args.topic, args.verbose);
    if (check) {
      const warnThreshold = PIPELINE_CONFIG.scoring.warnThreshold;
      const icon = check.score >= warnThreshold ? "+" : "!";
      console.log(
        `   ${icon} SEO score: ${check.score}/100 | Volume: ${check.volume} | KD: ${check.kd}`
      );
      if (check.score < warnThreshold) {
        console.log(
          `   ! Below recommended threshold (${warnThreshold}). This topic may have limited search demand.`
        );
        console.log(`   Proceeding anyway (use --skip-validation to silence this check).`);
      }
    }
  } else if (ideaContext) {
    console.log(
      `   + Pre-validated: score ${ideaContext.score}/100 | Volume: ${ideaContext.searchVolume} | KD: ${ideaContext.keywordDifficulty}`
    );
  }

  console.log();

  // Step 0: Research FAQs with OpenAI web search
  console.log("0. Researching topic with OpenAI web search...");
  let researchedFaqs: { question: string; answer: string }[] = [];
  try {
    researchedFaqs = await getRelatedQuestions(args.topic, args.verbose);
    console.log(`   Found ${researchedFaqs.length} researched FAQs to feed into generation`);
  } catch (err) {
    console.warn(`   Research skipped: ${err instanceof Error ? err.message : err}`);
  }

  // Step 1: Generate
  console.log("1. Generating content with OpenAI...");
  const raw = await generatePost(args.topic, args.category, args.verbose);
  console.log(`   Title: "${raw.title}"`);
  console.log(`   Category: ${raw.category}`);

  // Merge researched FAQs into generated FAQs (fuzzy deduplicated)
  if (researchedFaqs.length > 0) {
    const { merged, skipped } = mergeFaqs(raw.faqs, researchedFaqs);
    console.log(`   FAQs after merge: ${raw.faqs.length} (${merged} added, ${skipped} near-duplicates skipped)`);
  }

  // Step 2: Post-process
  console.log("2. Post-processing...");
  const post = await postProcess(raw, args.verbose);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Words: ${post.wordCount}`);
  console.log(`   Reading time: ${post.readingTime} min`);
  console.log(`   Headings: ${post.headings.length}`);
  console.log(`   FAQs: ${post.faqs.length}`);
  console.log(`   Images: ${post.images.length}`);

  // Step 3: Validate
  console.log("3. Validating...");
  const validation = validatePost(post);

  if (validation.warnings.length > 0) {
    console.log("   Warnings:");
    validation.warnings.forEach((w) => console.log(`     - ${w}`));
  }

  if (!validation.valid) {
    console.error("   VALIDATION FAILED:");
    validation.errors.forEach((e) => console.error(`     - ${e}`));
    console.error("\n   Post not published. Fix errors and retry.");
    return false;
  }

  console.log("   Passed all checks.");

  // Step 4: Publish
  if (args.dryRun) {
    console.log("4. Skipping publish (dry run).");
    if (args.verbose) {
      console.log("\n--- Generated Post Preview ---");
      console.log(JSON.stringify(post, null, 2));
    }
  } else {
    console.log("4. Publishing...");
    publishPost(post);
    console.log(`   Published to: content/blog/${post.slug}.json`);
    console.log(`   Updated content index.`);
  }

  console.log(`\nDone.\n`);
  return true;
}

// --- Auto mode ---

async function runAuto(args: PipelineArgs) {
  console.log(`\n=== DispoSight Auto Pipeline ===`);
  console.log(`Category: ${BLOG_CATEGORIES[args.category!]?.name || args.category}`);
  console.log(`Posts to generate: ${args.count}`);
  console.log();

  // Step 1: Discover and score
  const scored = await discoverAndScoreIdeas(args.category!, args.verbose);
  console.log(formatScoredIdeas(scored, 10));

  // Step 2: Filter by threshold
  const minScore = PIPELINE_CONFIG.scoring.minOpportunityScore;
  const qualified = scored.filter((s) => s.score >= minScore);

  if (qualified.length === 0) {
    console.error(
      `\nNo ideas scored above ${minScore}. Aborting auto-generation.`
    );
    console.error("Try a different category or lower the threshold in config.");
    process.exit(1);
  }

  console.log(`\n${qualified.length} ideas above threshold (${minScore}).`);
  const toGenerate = qualified.slice(0, args.count);
  console.log(`Will generate ${toGenerate.length} post(s):\n`);
  toGenerate.forEach((idea, i) => {
    console.log(`  ${i + 1}. "${idea.keyword}" (score: ${idea.score}, vol: ${idea.searchVolume}, KD: ${idea.keywordDifficulty})`);
  });

  // Step 3: Generate each
  let successCount = 0;
  for (let i = 0; i < toGenerate.length; i++) {
    const idea = toGenerate[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Generating ${i + 1}/${toGenerate.length}: "${idea.keyword}"`);
    console.log("=".repeat(60));

    const genArgs: PipelineArgs = {
      ...args,
      mode: "generate",
      topic: idea.keyword,
    };

    try {
      const success = await runGenerate(genArgs, idea);
      if (success) successCount++;
    } catch (err) {
      console.error(`\nFailed to generate "${idea.keyword}": ${err instanceof Error ? err.message : err}`);
      console.error("Continuing to next idea...\n");
    }

    // Brief delay between posts to avoid rate limits
    if (i < toGenerate.length - 1) {
      console.log("Waiting 3 seconds before next post...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`\n=== Auto Pipeline Complete ===`);
  console.log(`Generated: ${successCount}/${toGenerate.length} posts`);
  console.log();
}

// --- Closure mode ---

async function runClosure(args: PipelineArgs) {
  console.log(`\n--- DispoSight Closure Post Pipeline ---`);
  console.log(`Company: "${args.closure}"`);
  const category = args.category || PIPELINE_CONFIG.closureDefaults.category;
  console.log(`Category: ${category}`);
  if (args.dryRun) console.log(`Mode: DRY RUN (will not publish)`);
  console.log();

  // Step 1: Research closure
  console.log("1. Researching closure with OpenAI web search...");
  const research = await researchClosure(args.closure, args.verbose);
  console.log(`   Company: ${research.companyName}`);
  console.log(`   Stores: ${research.storeCount ?? "unknown"}`);
  console.log(`   Employees: ${research.employeeCount ?? "unknown"}`);
  console.log(`   Timeline: ${research.timeline || "unknown"}`);
  console.log(`   Liquidator: ${research.liquidator || "unknown"}`);
  console.log(`   Asset types: ${research.assetTypes.join(", ") || "unknown"}`);
  console.log(`   Sources: ${research.sources.length}`);
  console.log(`   FAQs from research: ${research.faqs.length}`);
  console.log();

  // Step 2: Generate closure post
  console.log("2. Generating closure post with OpenAI...");
  const raw = await generateClosurePost(research, category, args.verbose);
  console.log(`   Title: "${raw.title}"`);
  console.log(`   Category: ${raw.category}`);

  // Merge researched FAQs into generated FAQs (fuzzy deduplicated)
  if (research.faqs.length > 0) {
    const { merged, skipped } = mergeFaqs(raw.faqs, research.faqs);
    console.log(`   FAQs after merge: ${raw.faqs.length} (${merged} added, ${skipped} near-duplicates skipped)`);
  }

  // Merge research sources into generated sources
  if (research.sources.length > 0) {
    const existingUrls = new Set(raw.sources.map((s) => s.url.toLowerCase()));
    for (const source of research.sources) {
      if (!existingUrls.has(source.url.toLowerCase())) {
        raw.sources.push(source);
      }
    }
  }

  // Step 3: Post-process (always as draft)
  console.log("3. Post-processing (as draft)...");
  const post = await postProcess(raw, args.verbose, { isDraft: true, companyName: research.companyName });
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Words: ${post.wordCount}`);
  console.log(`   Reading time: ${post.readingTime} min`);
  console.log(`   Headings: ${post.headings.length}`);
  console.log(`   FAQs: ${post.faqs.length}`);
  console.log(`   Draft: ${post.isDraft}`);

  // Step 4: Validate (with closure thresholds)
  console.log("4. Validating (closure thresholds)...");
  const validation = validatePost(post, { isClosure: true });

  if (validation.warnings.length > 0) {
    console.log("   Warnings:");
    validation.warnings.forEach((w) => console.log(`     - ${w}`));
  }

  if (!validation.valid) {
    console.error("   VALIDATION FAILED:");
    validation.errors.forEach((e) => console.error(`     - ${e}`));
    console.error("\n   Post not published. Fix errors and retry.");
    return;
  }

  console.log("   Passed all checks.");

  // Step 5: Publish (as draft — no search engine pings)
  if (args.dryRun) {
    console.log("5. Skipping publish (dry run).");
    if (args.verbose) {
      console.log("\n--- Generated Closure Post Preview ---");
      console.log(JSON.stringify(post, null, 2));
    }
  } else {
    console.log("5. Publishing as DRAFT...");
    publishPost(post);
    console.log(`   Saved to: content/blog/${post.slug}.json`);
    console.log(`   Updated content index (as draft).`);
    console.log(`   Search engine pings: SKIPPED (draft)`);
  }

  console.log(`\nDraft published. Review and go live with:`);
  console.log(`  npm run pipeline -- --publish-draft ${post.slug}`);
  console.log();
}

// --- Publish Draft mode ---

async function runPublishDraft(args: PipelineArgs) {
  console.log(`\n--- DispoSight Publish Draft ---`);
  console.log(`Slug: "${args.publishDraft}"`);
  console.log();

  publishDraft(args.publishDraft);

  console.log(`   Draft flipped to LIVE.`);
  console.log(`   Content index updated.`);
  console.log(`   Search engine pings: SENT`);
  console.log(`\nPost is now LIVE at /blog/${args.publishDraft}`);
  console.log();
}

// --- Main ---

async function main() {
  const args = parseArgs();

  if (args.closure) {
    await runClosure(args);
  } else if (args.publishDraft) {
    await runPublishDraft(args);
  } else if (args.mode === "discover") {
    await runDiscover(args);
  } else if (args.mode === "auto") {
    await runAuto(args);
  } else {
    await runGenerate(args);
  }
}

main().catch((err) => {
  console.error("Pipeline failed:", err.message || err);
  process.exit(1);
});
