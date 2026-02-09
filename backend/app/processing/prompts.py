ENTITY_EXTRACTION_PROMPT = """Extract structured information from this corporate event signal.

Signal text: {text}
Source type: {source_type}

Extract and return as JSON:
{{
  "company_name": "Exact company name (cleaned, no abbreviations expanded)",
  "location_city": "City name or null",
  "location_state": "Two-letter US state code or null",
  "employees_affected": number or null,
  "event_type": "One of: layoff, shutdown, bankruptcy_ch7, bankruptcy_ch11, merger, acquisition, office_closure, plant_closing, facility_shutdown, relocation, ceasing_operations, liquidation",
  "summary": "One sentence summary optimized for ITAD sales reps. Focus on: what happened, how many affected, where, and urgency."
}}

Return ONLY valid JSON, no explanation."""

SIGNAL_CLASSIFICATION_PROMPT = """Classify this corporate distress signal for an ITAD (IT Asset Disposition) company.

Signal: {text}
Company: {company_name}
Source: {source_type}

Classify:
1. signal_type: The specific event type (layoff, shutdown, bankruptcy_ch7, bankruptcy_ch11, merger, acquisition, office_closure, plant_closing, relocation, liquidation)
2. signal_category: The broad category (warn, news, filing, bankruptcy)
3. confidence_score: 0-100, how confident are you in the classification?
4. severity_score: 0-100, how likely is this to produce surplus IT hardware?

Consider:
- WARN notices with 200+ employees = high severity (70+)
- Bankruptcy Chapter 7 (liquidation) = very high severity (85+)
- Office closures = high severity (65+)
- Mergers = medium severity (40-60) - depends on overlap
- Generic news mentions = lower confidence

Return as JSON:
{{
  "signal_type": "...",
  "signal_category": "...",
  "confidence_score": number,
  "severity_score": number
}}

Return ONLY valid JSON."""

RISK_SCORING_PROMPT = """Score the overall risk for this company based on recent signals.

Company: {company_name}
Recent signals:
{signals_summary}

Calculate a composite risk score (0-100) considering:
- Number of signals (more = higher risk)
- Signal diversity (multiple categories = higher risk)
- Recency (recent signals weighted more)
- Severity of individual signals
- Source reliability (WARN=95, EDGAR=90, CourtListener=90, GDELT=60)

Return as JSON:
{{
  "composite_risk_score": number,
  "risk_trend": "rising" or "stable" or "declining",
  "reasoning": "Brief explanation"
}}

Return ONLY valid JSON."""

SIGNAL_ANALYSIS_PROMPT = """You are an ITAD (IT Asset Disposition) intelligence analyst. Analyze this corporate distress signal and produce an actionable brief for an ITAD sales team.

## Signal Data
- Type: {signal_type}
- Title: {title}
- Summary: {summary}
- Severity Score: {severity_score}/100
- Confidence Score: {confidence_score}/100
- Affected Employees: {affected_employees}
- Estimated Devices: {device_estimate}
- Location: {location}

## Company Profile
- Name: {company_name}
- Industry: {industry}
- Sector: {sector}
- Employee Count: {employee_count}
- Risk Score: {risk_score}/100
- Risk Trend: {risk_trend}

## Source Text (truncated)
{raw_text}

## Correlated Signals
{correlated_signals}

Produce a JSON analysis with these fields:
{{{{
  "event_breakdown": "2-3 paragraph analysis of what happened, the scale, and timeline. Be specific about facts from the source text.",
  "itad_impact": "2-3 paragraph assessment of what this means for IT asset recovery. Estimate surplus equipment types (laptops, desktops, monitors, servers, networking gear, phones) and volumes based on employee count and event type.",
  "company_context": "1-2 paragraphs on the company's situation — financial health, industry position, and how this event fits their trajectory.",
  "asset_opportunity": "1-2 paragraphs on the specific asset recovery opportunity. Consider facility types (office vs manufacturing vs data center), typical IT refresh cycles, and urgency of disposition.",
  "opportunity_score": 0-100 integer rating the ITAD opportunity (consider volume, urgency, likelihood of surplus, competition),
  "recommended_actions": ["5 specific, actionable next steps for an ITAD sales rep to pursue this lead. Include who to contact, what to propose, and timing."],
  "correlated_signals_summary": "If correlated signals exist, summarize what the multi-source confirmation means for confidence. Otherwise null."
}}}}

Return ONLY valid JSON, no explanation."""
