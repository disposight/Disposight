-- ============================================================================
-- DispoSight Data Quality Cleanup — One-Time SQL Script
-- Run in Supabase SQL Editor AFTER deploying the pipeline fixes (Phase 1).
-- ============================================================================
-- Execute each section individually and verify counts before/after.

-- ============================================================================
-- PRE-CLEANUP COUNTS (run first to record baseline)
-- ============================================================================
SELECT 'signals' AS table_name, COUNT(*) AS cnt FROM signals
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'raw_signals', COUNT(*) FROM raw_signals;


-- ============================================================================
-- 2a. Delete garbage companies
-- ============================================================================

-- Mark raw signals from garbage companies as discarded
UPDATE raw_signals
SET processing_status = 'discarded',
    discard_reason = 'garbage_company_cleanup'
WHERE id IN (
    SELECT s.raw_signal_id
    FROM signals s
    JOIN companies c ON s.company_id = c.id
    WHERE c.normalized_name IN ('company name unknown', 'unknown')
       OR (c.name = 'Retail' AND c.headquarters_state = 'T3')
);

-- Delete garbage companies (CASCADE deletes their signals)
DELETE FROM companies
WHERE normalized_name IN ('company name unknown', 'unknown')
   OR (name = 'Retail' AND headquarters_state = 'T3');


-- ============================================================================
-- 2b. Merge MasterBrand duplicates
-- ============================================================================

-- Find both records
-- SELECT id, name, normalized_name, signal_count FROM companies
-- WHERE normalized_name LIKE '%masterbrand%';

-- Reassign signals from the duplicate (fewer signals) to the keeper (more signals)
WITH ranked AS (
    SELECT id, signal_count,
           ROW_NUMBER() OVER (ORDER BY signal_count DESC, created_at ASC) AS rn
    FROM companies
    WHERE normalized_name LIKE '%masterbrand%'
)
UPDATE signals
SET company_id = (SELECT id FROM ranked WHERE rn = 1)
WHERE company_id = (SELECT id FROM ranked WHERE rn = 2);

-- Delete orphan watchlist entries for the duplicate
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY signal_count DESC, created_at ASC) AS rn
    FROM companies
    WHERE normalized_name LIKE '%masterbrand%'
)
DELETE FROM watchlists
WHERE company_id = (SELECT id FROM ranked WHERE rn = 2);

-- Delete the duplicate company
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY signal_count DESC, created_at ASC) AS rn
    FROM companies
    WHERE normalized_name LIKE '%masterbrand%'
)
DELETE FROM companies
WHERE id = (SELECT id FROM ranked WHERE rn = 2);


-- ============================================================================
-- 2c. Fix Amazon HQ
-- ============================================================================

UPDATE companies
SET headquarters_state = 'WA',
    headquarters_city = 'Seattle'
WHERE normalized_name = 'amazon';


-- ============================================================================
-- 2d. Deduplicate existing signals
-- ============================================================================

-- Mark raw_signals for duplicates as discarded
UPDATE raw_signals
SET processing_status = 'discarded',
    discard_reason = 'dedup_cleanup'
WHERE id IN (
    SELECT raw_signal_id FROM (
        SELECT id, raw_signal_id,
               ROW_NUMBER() OVER (
                   PARTITION BY company_id, signal_type, DATE(source_published_at)
                   ORDER BY severity_score DESC, created_at ASC
               ) AS rn
        FROM signals
    ) ranked
    WHERE rn > 1
    AND raw_signal_id IS NOT NULL
);

-- Delete duplicate signals (keep the highest-severity, earliest-created per group)
DELETE FROM signals
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY company_id, signal_type, DATE(source_published_at)
                   ORDER BY severity_score DESC, created_at ASC
               ) AS rn
        FROM signals
    ) ranked
    WHERE rn > 1
);


-- ============================================================================
-- 2e. Cap Ford device estimate (and any others over 10,000)
-- ============================================================================

UPDATE signals
SET device_estimate = 10000
WHERE device_estimate > 10000;


-- ============================================================================
-- 2f. Handle stuck raw signals
-- ============================================================================

-- Mark raw signals that already have a promoted Signal as "processed"
UPDATE raw_signals
SET processing_status = 'processed'
WHERE processing_status = 'raw'
  AND id IN (SELECT raw_signal_id FROM signals WHERE raw_signal_id IS NOT NULL);

-- Remaining "raw" ones will be retried by the pipeline (safe after dedup is deployed)


-- ============================================================================
-- 2g. Recalculate company stats
-- ============================================================================

UPDATE companies c
SET signal_count = COALESCE(stats.cnt, 0),
    last_signal_at = stats.last_at
FROM (
    SELECT company_id,
           COUNT(*) AS cnt,
           MAX(source_published_at) AS last_at
    FROM signals
    GROUP BY company_id
) stats
WHERE c.id = stats.company_id;

-- Zero out companies with no remaining signals
UPDATE companies
SET signal_count = 0,
    last_signal_at = NULL
WHERE id NOT IN (SELECT DISTINCT company_id FROM signals);


-- ============================================================================
-- POST-CLEANUP COUNTS (verify the cleanup worked)
-- ============================================================================
SELECT 'signals' AS table_name, COUNT(*) AS cnt FROM signals
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'raw_signals (discarded)', COUNT(*) FROM raw_signals WHERE processing_status = 'discarded';

-- Verify no garbage companies remain
SELECT COUNT(*) AS garbage_remaining
FROM companies
WHERE normalized_name IN ('company name unknown', 'unknown')
   OR (name = 'Retail' AND headquarters_state = 'T3');

-- Verify MasterBrand is now a single record
SELECT id, name, signal_count
FROM companies
WHERE normalized_name LIKE '%masterbrand%';

-- Verify Amazon HQ is correct
SELECT name, headquarters_city, headquarters_state
FROM companies
WHERE normalized_name = 'amazon';

-- Verify no device estimates over 10,000
SELECT COUNT(*) AS over_cap FROM signals WHERE device_estimate > 10000;
