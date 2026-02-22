import { getDataForSEOCredentials, PIPELINE_CONFIG } from "./config";

const { dataforseo } = PIPELINE_CONFIG;

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  competition: number;
  competitionLevel: string;
  serpFeatures: string[];
  searchIntent: string;
  monthlySearches: { month: number; year: number; search_volume: number }[];
}

interface DataForSEOResult {
  keyword: string;
  keyword_info?: {
    search_volume: number | null;
    competition: number | null;
    competition_level: string | null;
    cpc: number | null;
    monthly_searches: { month: number; year: number; search_volume: number }[] | null;
  };
  keyword_properties?: {
    keyword_difficulty: number | null;
  };
  serp_info?: {
    serp_item_types: string[] | null;
  };
  search_intent_info?: {
    main_intent: string | null;
  };
}

interface DataForSEOResponse {
  status_code: number;
  status_message: string;
  tasks?: {
    status_code: number;
    status_message: string;
    result?: {
      items: DataForSEOResult[];
      total_count: number;
    }[];
  }[];
}

function getAuthHeader(): string {
  const { login, password } = getDataForSEOCredentials();
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

export async function fetchKeywordData(
  seedKeywords: string[],
  verbose = false
): Promise<KeywordData[]> {
  if (seedKeywords.length === 0) return [];

  const allResults: KeywordData[] = [];

  // Send one keyword per request (some DataForSEO plans only allow 1 task at a time)
  for (let i = 0; i < seedKeywords.length; i++) {
    const keyword = seedKeywords[i];

    if (verbose && i > 0 && i % 5 === 0) {
      console.log(`  Processing keyword ${i + 1}/${seedKeywords.length}...`);
    }

    const tasks = [{
      keyword,
      location_code: dataforseo.location,
      language_code: dataforseo.language,
      include_serp_info: true,
      include_seed_keyword: true,
      limit: 20, // Get top 20 suggestions per seed
    }];

    try {
      const res = await fetch(
        `${dataforseo.baseUrl}/dataforseo_labs/google/keyword_suggestions/live`,
        {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tasks),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DataForSEO API error (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as DataForSEOResponse;

      // Check top-level auth errors
      if (data.status_code && data.status_code !== 20000) {
        console.warn(`  ⚠ DataForSEO: ${data.status_message} (code: ${data.status_code})`);
        if (data.status_code === 40100) {
          console.warn(`  Check your credentials at https://app.dataforseo.com/api-access`);
          return allResults; // Stop processing — auth is broken
        }
      }

      if (data.tasks) {
        for (const task of data.tasks) {
          if (task.status_code !== 20000 || !task.result) {
            if (verbose) console.warn(`  Task error: ${task.status_message} (${task.status_code})`);
            continue;
          }

          for (const resultSet of task.result) {
            if (!resultSet.items) continue;

            for (const item of resultSet.items) {
              allResults.push({
                keyword: item.keyword,
                searchVolume: item.keyword_info?.search_volume || 0,
                keywordDifficulty: item.keyword_properties?.keyword_difficulty || 0,
                cpc: item.keyword_info?.cpc || 0,
                competition: item.keyword_info?.competition || 0,
                competitionLevel: item.keyword_info?.competition_level || "UNKNOWN",
                serpFeatures: item.serp_info?.serp_item_types || [],
                searchIntent: item.search_intent_info?.main_intent || "informational",
                monthlySearches: item.keyword_info?.monthly_searches || [],
              });
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  DataForSEO batch error: ${msg}`);
    }

    // Rate limit delay between requests
    if (i < seedKeywords.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Deduplicate by keyword
  const seen = new Set<string>();
  const deduped: KeywordData[] = [];
  for (const result of allResults) {
    const key = result.keyword.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  if (verbose) {
    console.log(`  DataForSEO returned ${deduped.length} unique keywords`);
    const withVolume = deduped.filter((k) => k.searchVolume > 0).length;
    console.log(`  ${withVolume} keywords have search volume > 0`);
  }

  return deduped;
}

/**
 * Derive search volume from monthly_searches when the top-level search_volume is null.
 * Uses the average of the most recent 12 months that have data > 0.
 */
function deriveSearchVolume(
  searchVolume: number | null | undefined,
  monthlySearches: { month: number; year: number; search_volume: number }[] | null | undefined
): number {
  if (searchVolume && searchVolume > 0) return searchVolume;
  if (!monthlySearches || monthlySearches.length === 0) return 0;

  // Get months with actual data, sorted most recent first
  const withData = monthlySearches
    .filter((m) => m.search_volume > 0)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 12);

  if (withData.length === 0) return 0;
  const avg = Math.round(withData.reduce((sum, m) => sum + m.search_volume, 0) / withData.length);
  return avg;
}

// Fetch keyword data for specific keywords (not suggestions, just the keywords themselves)
export async function fetchKeywordVolumes(
  keywords: string[],
  verbose = false
): Promise<KeywordData[]> {
  if (keywords.length === 0) return [];

  // historical_search_volume returns full keyword data for exact keywords submitted
  // (unlike bulk_keyword_difficulty which only returns KD)
  const tasks = [
    {
      keywords,
      location_code: dataforseo.location,
      language_code: dataforseo.language,
    },
  ];

  try {
    const res = await fetch(
      `${dataforseo.baseUrl}/dataforseo_labs/google/historical_search_volume/live`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tasks),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DataForSEO bulk API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as DataForSEOResponse;
    const results: KeywordData[] = [];

    if (data.tasks) {
      for (const task of data.tasks) {
        if (task.status_code !== 20000 || !task.result) continue;

        for (const resultSet of task.result) {
          if (!resultSet.items) continue;

          for (const item of resultSet.items) {
            const monthly = item.keyword_info?.monthly_searches || [];
            const volume = deriveSearchVolume(item.keyword_info?.search_volume, monthly);

            results.push({
              keyword: item.keyword,
              searchVolume: volume,
              keywordDifficulty: item.keyword_properties?.keyword_difficulty || 0,
              cpc: item.keyword_info?.cpc || 0,
              competition: item.keyword_info?.competition || 0,
              competitionLevel: item.keyword_info?.competition_level || "UNKNOWN",
              serpFeatures: item.serp_info?.serp_item_types || [],
              searchIntent: item.search_intent_info?.main_intent || "informational",
              monthlySearches: monthly,
            });
          }
        }
      }
    }

    if (verbose) {
      console.log(`  Bulk volume check: ${results.length} keywords returned`);
      const withVol = results.filter((r) => r.searchVolume > 0).length;
      console.log(`  ${withVol} keywords have search volume > 0`);
    }

    return results;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  DataForSEO bulk error: ${msg}`);
    return [];
  }
}
