-- DispoSight Initial Schema
-- Run against Supabase PostgreSQL

-- =============================================================
-- RAW_SIGNALS
-- =============================================================
CREATE TABLE raw_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(50) NOT NULL,
    company_name VARCHAR(500) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE,
    locations JSONB DEFAULT '[]',
    employees_affected INTEGER,
    source_url TEXT,
    raw_text TEXT,
    content_hash VARCHAR(64),
    processing_status VARCHAR(50) DEFAULT 'raw',
    discard_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TENANTS
-- =============================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    max_seats INTEGER NOT NULL DEFAULT 1,
    max_watchlist_companies INTEGER NOT NULL DEFAULT 50,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- COMPANIES
-- =============================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500) NOT NULL UNIQUE,
    ticker VARCHAR(20),
    cik VARCHAR(20),
    domain VARCHAR(255),
    industry VARCHAR(255),
    sector VARCHAR(255),
    sic_code VARCHAR(10),
    employee_count INTEGER,
    headquarters_city VARCHAR(255),
    headquarters_state VARCHAR(10),
    headquarters_lat DECIMAL(10, 7),
    headquarters_lng DECIMAL(10, 7),
    composite_risk_score INTEGER DEFAULT 0,
    signal_count INTEGER DEFAULT 0,
    last_signal_at TIMESTAMPTZ,
    risk_trend VARCHAR(20) DEFAULT 'stable',
    enrichment_status VARCHAR(50) DEFAULT 'pending',
    enriched_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SIGNALS
-- =============================================================
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_signal_id UUID REFERENCES raw_signals(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    signal_type VARCHAR(50) NOT NULL,
    signal_category VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    severity_score INTEGER NOT NULL DEFAULT 0,
    source_name VARCHAR(255) NOT NULL,
    source_url TEXT,
    source_published_at TIMESTAMPTZ,
    location_city VARCHAR(255),
    location_state VARCHAR(10),
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    affected_employees INTEGER,
    extracted_entities JSONB DEFAULT '[]',
    correlation_group_id UUID,
    device_estimate INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- WATCHLISTS
-- =============================================================
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, company_id)
);

-- =============================================================
-- ALERTS
-- =============================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    signal_types VARCHAR(50)[] DEFAULT '{}',
    min_confidence_score INTEGER DEFAULT 50,
    min_severity_score INTEGER DEFAULT 0,
    states VARCHAR(10)[] DEFAULT '{}',
    company_ids UUID[] DEFAULT '{}',
    watchlist_only BOOLEAN DEFAULT false,
    delivery_method VARCHAR(50) DEFAULT 'email',
    frequency VARCHAR(50) DEFAULT 'realtime',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- ALERT_HISTORY
-- =============================================================
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
    delivery_status VARCHAR(50) NOT NULL,
    subject VARCHAR(500),
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SIGNAL_SOURCES
-- =============================================================
CREATE TABLE signal_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,
    schedule_cron VARCHAR(100),
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(50),
    last_run_signals_count INTEGER DEFAULT 0,
    last_run_duration_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SUBSCRIPTIONS
-- =============================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    plan_name VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    seats INTEGER NOT NULL DEFAULT 1,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX idx_raw_signals_source_type ON raw_signals(source_type);
CREATE INDEX idx_raw_signals_content_hash ON raw_signals(content_hash);
CREATE INDEX idx_raw_signals_processing_status ON raw_signals(processing_status);
CREATE INDEX idx_raw_signals_created_at ON raw_signals(created_at DESC);
CREATE INDEX idx_raw_signals_company_name ON raw_signals(company_name);

CREATE INDEX idx_companies_name_search ON companies USING gin(to_tsvector('english', name));
CREATE INDEX idx_companies_risk_score ON companies(composite_risk_score DESC);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_cik ON companies(cik);
CREATE INDEX idx_companies_state ON companies(headquarters_state);

CREATE INDEX idx_signals_company ON signals(company_id);
CREATE INDEX idx_signals_type ON signals(signal_type);
CREATE INDEX idx_signals_category ON signals(signal_category);
CREATE INDEX idx_signals_confidence ON signals(confidence_score DESC);
CREATE INDEX idx_signals_severity ON signals(severity_score DESC);
CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_signals_correlation ON signals(correlation_group_id);
CREATE INDEX idx_signals_state ON signals(location_state);
CREATE INDEX idx_signals_feed ON signals(created_at DESC, confidence_score DESC);
CREATE INDEX idx_signals_company_timeline ON signals(company_id, created_at DESC);

CREATE INDEX idx_watchlists_tenant ON watchlists(tenant_id);
CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alert_history_tenant ON alert_history(tenant_id);
CREATE INDEX idx_alert_history_created ON alert_history(created_at DESC);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON users FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON watchlists FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON alerts FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON alert_history FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_isolation" ON subscriptions FOR ALL
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =============================================================
-- SEED SIGNAL SOURCES
-- =============================================================
INSERT INTO signal_sources (name, source_type, schedule_cron, is_enabled) VALUES
    ('WARN Act (data.gov)', 'warn_act', '0 */6 * * *', true),
    ('GDELT News', 'gdelt', '*/30 * * * *', true),
    ('SEC EDGAR', 'sec_edgar', '0 1,7,13,19 * * *', true),
    ('CourtListener', 'courtlistener', '0 3,15 * * *', true);
