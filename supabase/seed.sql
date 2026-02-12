-- DispoSight Seed Data
-- Realistic sample data for development

-- Tenant
INSERT INTO tenants (id, name, slug, plan) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Demo Acq Co', 'demo-acq-co', 'professional');

-- Companies
INSERT INTO companies (id, name, normalized_name, ticker, industry, headquarters_city, headquarters_state, employee_count, composite_risk_score, signal_count, risk_trend) VALUES
    ('aaaa0001-0000-0000-0000-000000000001', 'Acme Corporation', 'acme corporation', 'ACME', 'Technology', 'San Jose', 'CA', 4200, 87, 5, 'rising'),
    ('aaaa0002-0000-0000-0000-000000000002', 'Nexgen Industries', 'nexgen industries', NULL, 'Manufacturing', 'Houston', 'TX', 1800, 72, 3, 'rising'),
    ('aaaa0003-0000-0000-0000-000000000003', 'Vertex Solutions Inc', 'vertex solutions', 'VTXS', 'Software', 'Chicago', 'IL', 850, 65, 2, 'stable'),
    ('aaaa0004-0000-0000-0000-000000000004', 'Pinnacle Health Group', 'pinnacle health group', 'PHG', 'Healthcare', 'Atlanta', 'GA', 3100, 58, 2, 'declining'),
    ('aaaa0005-0000-0000-0000-000000000005', 'SkyBridge Communications', 'skybridge communications', NULL, 'Telecom', 'Dallas', 'TX', 2400, 45, 1, 'stable'),
    ('aaaa0006-0000-0000-0000-000000000006', 'Pacific Retail Holdings', 'pacific retail holdings', 'PRHL', 'Retail', 'Los Angeles', 'CA', 5600, 91, 7, 'rising'),
    ('aaaa0007-0000-0000-0000-000000000007', 'Granite Financial Services', 'granite financial services', 'GFS', 'Finance', 'New York', 'NY', 1200, 35, 1, 'stable'),
    ('aaaa0008-0000-0000-0000-000000000008', 'TerraWorks Engineering', 'terraworks engineering', NULL, 'Engineering', 'Denver', 'CO', 950, 78, 4, 'rising');

-- Signals
INSERT INTO signals (id, company_id, signal_type, signal_category, title, summary, confidence_score, severity_score, source_name, source_url, location_city, location_state, affected_employees, device_estimate, created_at) VALUES
    (gen_random_uuid(), 'aaaa0001-0000-0000-0000-000000000001', 'layoff', 'warn', 'Acme Corporation: WARN notice filed', 'WARN notice filed in CA: 340 employees affected at San Jose headquarters. Effective date March 15. High likelihood of 500+ surplus assets including laptops, monitors, and networking equipment.', 95, 82, 'warn_act', 'https://data.edd.ca.gov', 'San Jose', 'CA', 340, 510, NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), 'aaaa0001-0000-0000-0000-000000000001', 'office_closure', 'news', 'Acme Corporation closing San Jose R&D facility', 'Reports indicate Acme Corp is shutting down its 80,000 sq ft R&D center in San Jose as part of a broader restructuring effort.', 72, 78, 'gdelt', 'https://example.com/news/acme', 'San Jose', 'CA', NULL, 400, NOW() - INTERVAL '5 hours'),
    (gen_random_uuid(), 'aaaa0006-0000-0000-0000-000000000006', 'bankruptcy_ch11', 'bankruptcy', 'Pacific Retail Holdings files Chapter 11', 'Pacific Retail Holdings filed for Chapter 11 bankruptcy protection. 5,600 employees across 42 retail locations. Massive surplus of POS systems, inventory management hardware, and office equipment expected.', 92, 95, 'courtlistener', 'https://courtlistener.com/example', 'Los Angeles', 'CA', 5600, 16800, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'aaaa0006-0000-0000-0000-000000000006', 'liquidation', 'news', 'Pacific Retail planning to close 28 stores', 'Pacific Retail confirmed plans to close 28 of 42 stores nationwide. Equipment liquidation expected within 60 days.', 85, 90, 'gdelt', 'https://example.com/news/pacific', 'Los Angeles', 'CA', 3200, 9600, NOW() - INTERVAL '18 hours'),
    (gen_random_uuid(), 'aaaa0002-0000-0000-0000-000000000002', 'facility_shutdown', 'warn', 'Nexgen Industries shutting Houston plant', 'Nexgen Industries filed WARN notice for Houston manufacturing facility. 420 employees affected. Plant closing effective April 1. Significant industrial computing and automation equipment expected.', 95, 75, 'warn_act', 'https://twc.texas.gov', 'Houston', 'TX', 420, 840, NOW() - INTERVAL '8 hours'),
    (gen_random_uuid(), 'aaaa0002-0000-0000-0000-000000000002', 'restructuring', 'filing', 'Nexgen Industries 8-K: material restructuring', 'SEC 8-K filing reveals Nexgen Industries undertaking significant restructuring, including closure of 3 facilities and workforce reduction of 25%.', 90, 70, 'sec_edgar', 'https://sec.gov/example', 'Houston', 'TX', 450, 675, NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), 'aaaa0003-0000-0000-0000-000000000003', 'layoff', 'warn', 'Vertex Solutions layoffs in Chicago', 'WARN notice: 180 employees at Vertex Solutions Chicago headquarters. Software company downsizing engineering team.', 95, 68, 'warn_act', 'https://illinoisworknet.com', 'Chicago', 'IL', 180, 270, NOW() - INTERVAL '12 hours'),
    (gen_random_uuid(), 'aaaa0008-0000-0000-0000-000000000008', 'merger', 'filing', 'TerraWorks Engineering acquisition by GlobalBuild', 'SEC filing indicates GlobalBuild Corp acquiring TerraWorks Engineering for $450M. Significant facility overlap in Denver and Phoenix markets.', 88, 62, 'sec_edgar', 'https://sec.gov/example2', 'Denver', 'CO', NULL, 400, NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), 'aaaa0008-0000-0000-0000-000000000008', 'office_closure', 'news', 'TerraWorks to close Phoenix office post-merger', 'Following GlobalBuild acquisition, TerraWorks will consolidate operations and close its Phoenix satellite office. 150 employees affected.', 70, 65, 'gdelt', 'https://example.com/news/terra', 'Phoenix', 'AZ', 150, 225, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'aaaa0004-0000-0000-0000-000000000004', 'layoff', 'news', 'Pinnacle Health Group reducing workforce', 'Pinnacle Health Group announced 12% workforce reduction as part of cost-cutting measures. Estimated 370 positions affected across Atlanta and Nashville.', 65, 55, 'gdelt', 'https://example.com/news/pinnacle', 'Atlanta', 'GA', 370, 555, NOW() - INTERVAL '4 days');

-- Signal sources (update with realistic last-run data)
UPDATE signal_sources SET
    last_run_at = NOW() - INTERVAL '3 hours',
    last_run_status = 'success',
    last_run_signals_count = 8,
    last_run_duration_ms = 4520,
    error_count = 0
WHERE source_type = 'warn_act';

UPDATE signal_sources SET
    last_run_at = NOW() - INTERVAL '1 hour',
    last_run_status = 'success',
    last_run_signals_count = 12,
    last_run_duration_ms = 8340,
    error_count = 0
WHERE source_type = 'gdelt';

UPDATE signal_sources SET
    last_run_at = NOW() - INTERVAL '5 hours',
    last_run_status = 'success',
    last_run_signals_count = 3,
    last_run_duration_ms = 12100,
    error_count = 0
WHERE source_type = 'sec_edgar';

UPDATE signal_sources SET
    last_run_at = NOW() - INTERVAL '9 hours',
    last_run_status = 'success',
    last_run_signals_count = 2,
    last_run_duration_ms = 6780,
    error_count = 0
WHERE source_type = 'courtlistener';
