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
  "summary": "One sentence summary optimized for asset acquisition teams. Focus on: what happened, how many affected, where, and urgency."
}}

Return ONLY valid JSON, no explanation."""

SIGNAL_CLASSIFICATION_PROMPT = """Classify this corporate distress signal for an asset disposition intelligence platform.

Signal: {text}
Company: {company_name}
Source: {source_type}

Classify:
1. signal_type: The specific event type (layoff, shutdown, bankruptcy_ch7, bankruptcy_ch11, merger, acquisition, office_closure, plant_closing, relocation, liquidation)
2. signal_category: The broad category (warn, news, filing, bankruptcy)
3. confidence_score: 0-100, how confident are you in the classification?
4. severity_score: 0-100, how likely is this to produce surplus corporate assets?

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

SIGNAL_ANALYSIS_PROMPT = """You are a corporate distress intelligence analyst. Analyze this signal and produce an actionable brief for an asset acquisition team.

## Signal Data
- Type: {signal_type}
- Title: {title}
- Summary: {summary}
- Severity Score: {severity_score}/100
- Confidence Score: {confidence_score}/100
- Affected Employees: {affected_employees}
- Estimated Assets: {device_estimate}
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
  "asset_impact": "2-3 paragraph assessment of what this means for asset recovery. Estimate surplus equipment types (laptops, desktops, monitors, servers, networking gear, phones) and volumes based on employee count and event type.",
  "company_context": "1-2 paragraphs on the company's situation — financial health, industry position, and how this event fits their trajectory.",
  "asset_opportunity": "1-2 paragraphs on the specific asset recovery opportunity. Consider facility types (office vs manufacturing vs data center), typical refresh cycles, and urgency of disposition.",
  "opportunity_score": 0-100 integer rating the disposition opportunity (consider volume, urgency, likelihood of surplus, competition),
  "recommended_actions": ["5 specific, actionable next steps for a deal team to pursue this opportunity. Include who to contact, what to propose, and timing."],
  "likely_asset_types": [
    {{{{"category": "IT Equipment", "examples": "laptops, desktops, monitors, docking stations", "estimated_volume": "500-800 units"}}}},
    {{{{"category": "Office Furniture", "examples": "desks, ergonomic chairs, conference tables", "estimated_volume": "200-400 pieces"}}}}
  ],
  "correlated_signals_summary": "If correlated signals exist, summarize what the multi-source confirmation means for confidence. Otherwise null."
}}}}

For likely_asset_types: Based on the company's industry, employee count, and event type, list 2-5 categories of physical assets likely available for disposition. Categories include: IT Equipment, Office Furniture, Data Center/Servers, Networking Gear, Phones/Telecom, Vehicles/Fleet, Manufacturing Equipment, Retail Fixtures, Medical Equipment, Warehouse/Logistics, AV Equipment. Include specific item examples and estimated volumes.

Return ONLY valid JSON, no explanation."""

DEAL_JUSTIFICATION_PROMPT = """You are writing a concise professional deal summary for an asset acquisition team. Write a single paragraph of 4-6 sentences covering these points in order:

1. What distress event occurred and the quality of evidence supporting it.
2. The estimated volume of surplus assets and their approximate recovery value.
3. The timing urgency — how quickly assets will become available.
4. A clear pursuit recommendation based on the overall picture.

Company: {company_name}
Signal types detected: {signal_types}
Sources: {source_names}
Estimated surplus devices: {total_devices}
Estimated recovery value: {revenue_estimate}
Disposition window: {disposition_window}
Deal score: {deal_score}/100 ({score_band_label})
Risk trend: {risk_trend}
Average severity: {avg_severity}/100
Average confidence: {avg_confidence}/100
Number of signals: {signal_count}

Write plain text only — no JSON, no bullet points, no headers, no markdown. The output should read like a brief you could paste into an email to a VP of Sales."""
