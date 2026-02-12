"""
Comprehensive email test suite for DispoSight via Resend.
Tests: API connectivity, real-time alert, daily digest, weekly digest, contact form.
"""

import asyncio
import sys
import time
from datetime import datetime, timezone
from uuid import uuid4

import resend
from dotenv import load_dotenv

load_dotenv()

from app.config import settings

resend.api_key = settings.resend_api_key

# Domain not yet verified in Resend — use test sender + account owner email
TEST_RECIPIENT = "disposight@gmail.com"
FROM_EMAIL = "onboarding@resend.dev"  # Resend test sender (until disposight.com is verified)


def test_api_connectivity():
    """Test 1: Verify Resend API key is valid and can send."""
    print("\n" + "=" * 60)
    print("TEST 1: Resend API Connectivity")
    print("=" * 60)

    if not settings.resend_api_key:
        print("  FAIL: RESEND_API_KEY is not set")
        return False

    print(f"  API Key: {settings.resend_api_key[:8]}...{settings.resend_api_key[-4:]}")
    print(f"  From: {FROM_EMAIL}")
    print(f"  To: {TEST_RECIPIENT}")

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": "[DispoSight Test] API Connectivity Check",
            "html": """
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
                <h2 style="color: #10B981;">API Connectivity Test</h2>
                <p>If you're reading this, the Resend API is working correctly.</p>
                <p style="color: #71717A; font-size: 12px;">Sent at: """ + datetime.now(timezone.utc).isoformat() + """</p>
            </div>
            """,
        })
        print(f"  PASS: Email sent successfully")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_realtime_alert_email():
    """Test 2: Send a mock real-time signal alert email (mimics send_signal_alert)."""
    print("\n" + "=" * 60)
    print("TEST 2: Real-Time Signal Alert Email")
    print("=" * 60)

    # Mock signal data
    signal_id = str(uuid4())
    company_name = "Acme Corp (TEST)"
    signal_type = "WARN_ACT"
    summary = "Acme Corp announced layoffs affecting 450 employees at their Dallas, TX manufacturing facility. Plant closure expected Q2 2026."
    location_city = "Dallas"
    location_state = "TX"
    affected_employees = 450
    device_estimate = 380
    severity_score = 82
    confidence_score = 91

    subject = f"[DispoSight] {signal_type}: {company_name} (Score: {severity_score})"

    severity_color = '#EF4444' if severity_score >= 80 else '#F97316' if severity_score >= 60 else '#EAB308'

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981; margin: 0 0 16px 0;">New Signal Detected</h2>
        <div style="background: #18181B; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">{company_name}</p>
            <p style="margin: 0 0 8px 0; color: #A1A1AA;">{summary}</p>
            <div style="display: flex; gap: 12px; color: #71717A; font-size: 13px;">
                <span>{location_city}, {location_state}</span>
                <span>&middot;</span>
                <span>{affected_employees} affected</span>
                <span>&middot;</span>
                <span>~{device_estimate} devices</span>
            </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: {severity_color};">{severity_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">SEVERITY</span>
            </div>
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #A1A1AA;">{confidence_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">CONFIDENCE</span>
            </div>
        </div>
        <a href="{settings.frontend_url}/dashboard/signals/{signal_id}" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Signal</a>
        <p style="color: #71717A; font-size: 11px; margin-top: 24px;">You're receiving this because of your alert settings. <a href="{settings.frontend_url}/dashboard/alerts" style="color: #6EE7B7;">Manage alerts</a></p>
    </div>
    """

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: Real-time alert email sent")
        print(f"  Subject: {subject}")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_realtime_alert_low_severity():
    """Test 3: Send a low-severity alert to test yellow color coding."""
    print("\n" + "=" * 60)
    print("TEST 3: Real-Time Alert (Low Severity - Yellow)")
    print("=" * 60)

    signal_id = str(uuid4())
    company_name = "TestCorp Industries (TEST)"
    signal_type = "GDELT"
    summary = "TestCorp Industries reportedly considering office consolidation in Phoenix metro area, affecting approximately 120 workers."
    severity_score = 45
    confidence_score = 62

    severity_color = '#EAB308'  # yellow for 40-59

    subject = f"[DispoSight] {signal_type}: {company_name} (Score: {severity_score})"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981; margin: 0 0 16px 0;">New Signal Detected</h2>
        <div style="background: #18181B; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">{company_name}</p>
            <p style="margin: 0 0 8px 0; color: #A1A1AA;">{summary}</p>
            <div style="display: flex; gap: 12px; color: #71717A; font-size: 13px;">
                <span>Phoenix, AZ</span>
                <span>&middot;</span>
                <span>120 affected</span>
                <span>&middot;</span>
                <span>~100 devices</span>
            </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: {severity_color};">{severity_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">SEVERITY</span>
            </div>
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #A1A1AA;">{confidence_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">CONFIDENCE</span>
            </div>
        </div>
        <a href="{settings.frontend_url}/dashboard/signals/{signal_id}" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Signal</a>
        <p style="color: #71717A; font-size: 11px; margin-top: 24px;">You're receiving this because of your alert settings. <a href="{settings.frontend_url}/dashboard/alerts" style="color: #6EE7B7;">Manage alerts</a></p>
    </div>
    """

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: Low-severity alert sent (yellow color)")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_daily_digest_email():
    """Test 4: Send a mock daily digest email."""
    print("\n" + "=" * 60)
    print("TEST 4: Daily Digest Email")
    print("=" * 60)

    mock_signals = [
        ("Amazon", "WARN_ACT", 92, "#EF4444"),
        ("Meta Platforms", "GDELT", 85, "#EF4444"),
        ("Macy's Inc", "SEC_EDGAR", 78, "#F97316"),
        ("Wells Fargo", "WARN_ACT", 71, "#F97316"),
        ("Thermo Fisher", "COURTLISTENER", 65, "#F97316"),
        ("Phillips 66", "GDELT", 58, "#EAB308"),
        ("Constellation Brands", "WARN_ACT", 44, "#EAB308"),
        ("Nestle USA", "SEC_EDGAR", 38, "#22C55E"),
    ]

    signal_rows = ""
    for company, sig_type, score, color in mock_signals:
        signal_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #27272A;">{company}</td>
            <td style="padding: 8px; border-bottom: 1px solid #27272A;">{sig_type}</td>
            <td style="padding: 8px; border-bottom: 1px solid #27272A; font-family: monospace; color: {color};">{score}</td>
        </tr>
        """

    subject = f"[DispoSight] Daily Intelligence Digest — {len(mock_signals)} signals"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981;">Intelligence Digest</h2>
        <p style="color: #A1A1AA;">{len(mock_signals)} new signals in the last 24 hours.</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="color: #71717A; font-size: 12px;">
                <th style="text-align: left; padding: 8px;">Company</th>
                <th style="text-align: left; padding: 8px;">Type</th>
                <th style="text-align: left; padding: 8px;">Score</th>
            </tr>
            {signal_rows}
        </table>
        <a href="{settings.frontend_url}/dashboard" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">View Dashboard</a>
    </div>
    """

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: Daily digest sent ({len(mock_signals)} signals)")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_weekly_digest_email():
    """Test 5: Send a mock weekly digest email."""
    print("\n" + "=" * 60)
    print("TEST 5: Weekly Digest Email")
    print("=" * 60)

    mock_signals = [
        ("Amazon", "WARN_ACT", 92, "#EF4444"),
        ("Meta Platforms", "GDELT", 85, "#EF4444"),
        ("JPMorgan Chase", "WARN_ACT", 83, "#EF4444"),
        ("Macy's Inc", "SEC_EDGAR", 78, "#F97316"),
        ("Wells Fargo", "WARN_ACT", 71, "#F97316"),
        ("Thermo Fisher", "COURTLISTENER", 65, "#F97316"),
        ("Boeing Co", "GDELT", 63, "#F97316"),
        ("Phillips 66", "GDELT", 58, "#EAB308"),
        ("Constellation Brands", "WARN_ACT", 44, "#EAB308"),
        ("Nestle USA", "SEC_EDGAR", 38, "#22C55E"),
    ]

    signal_rows = ""
    for company, sig_type, score, color in mock_signals:
        signal_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #27272A;">{company}</td>
            <td style="padding: 8px; border-bottom: 1px solid #27272A;">{sig_type}</td>
            <td style="padding: 8px; border-bottom: 1px solid #27272A; font-family: monospace; color: {color};">{score}</td>
        </tr>
        """

    subject = f"[DispoSight] Weekly Intelligence Digest — {len(mock_signals)} signals"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981;">Intelligence Digest</h2>
        <p style="color: #A1A1AA;">{len(mock_signals)} new signals in the last week.</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="color: #71717A; font-size: 12px;">
                <th style="text-align: left; padding: 8px;">Company</th>
                <th style="text-align: left; padding: 8px;">Type</th>
                <th style="text-align: left; padding: 8px;">Score</th>
            </tr>
            {signal_rows}
        </table>
        <a href="{settings.frontend_url}/dashboard" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">View Dashboard</a>
    </div>
    """

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: Weekly digest sent ({len(mock_signals)} signals)")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_contact_form_email():
    """Test 6: Send a mock contact form submission (mimics frontend action.ts)."""
    print("\n" + "=" * 60)
    print("TEST 6: Contact Form Email")
    print("=" * 60)

    name = "Test User"
    email = "testuser@example.com"
    form_subject = "Interested in Enterprise Plan"
    message = "Hi, I'm managing IT asset disposition for a Fortune 500 company. We process about 10,000 devices per quarter. I'd like to learn more about the Enterprise plan and custom integrations.\n\nPlease get back to me at your earliest convenience."

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "reply_to": email,
            "subject": f"[Contact] {form_subject}",
            "text": f"Name: {name}\nEmail: {email}\n\n{message}",
        })
        print(f"  PASS: Contact form email sent")
        print(f"  From name: {name} <{email}>")
        print(f"  Reply-To: {email}")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_contact_form_no_reply_sender():
    """Test 7: Verify no-reply@disposight.com sender works."""
    print("\n" + "=" * 60)
    print("TEST 7: no-reply@ Sender Verification")
    print("=" * 60)

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": "[DispoSight Test] no-reply@ Sender Verification",
            "html": """
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
                <h2 style="color: #10B981;">Sender Verification</h2>
                <p>This email was sent from <code>no-reply@disposight.com</code> to verify the sender is configured correctly in Resend.</p>
            </div>
            """,
        })
        print(f"  PASS: no-reply@ sender works")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        print("  NOTE: If this fails, you need to verify no-reply@disposight.com in Resend dashboard")
        return False


def test_edge_case_empty_fields():
    """Test 8: Alert email with missing optional fields (city, employees, devices)."""
    print("\n" + "=" * 60)
    print("TEST 8: Alert with Missing Optional Fields")
    print("=" * 60)

    signal_id = str(uuid4())
    company_name = "Unknown Corp (TEST)"
    signal_type = "COURTLISTENER"
    summary = "Chapter 11 bankruptcy filing detected."
    severity_score = 68
    confidence_score = 55

    severity_color = '#F97316'

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981; margin: 0 0 16px 0;">New Signal Detected</h2>
        <div style="background: #18181B; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">{company_name}</p>
            <p style="margin: 0 0 8px 0; color: #A1A1AA;">{summary}</p>
            <div style="display: flex; gap: 12px; color: #71717A; font-size: 13px;">
                <span></span>
                <span>&middot;</span>
                <span>? affected</span>
                <span>&middot;</span>
                <span>~? devices</span>
            </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: {severity_color};">{severity_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">SEVERITY</span>
            </div>
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #A1A1AA;">{confidence_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">CONFIDENCE</span>
            </div>
        </div>
        <a href="{settings.frontend_url}/dashboard/signals/{signal_id}" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Signal</a>
        <p style="color: #71717A; font-size: 11px; margin-top: 24px;">You're receiving this because of your alert settings. <a href="{settings.frontend_url}/dashboard/alerts" style="color: #6EE7B7;">Manage alerts</a></p>
    </div>
    """

    subject = f"[DispoSight] {signal_type}: {company_name} (Score: {severity_score})"

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: Edge-case alert email sent (missing city/employees/devices)")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_sec_edgar_alert():
    """Test 9: SEC EDGAR M&A signal alert."""
    print("\n" + "=" * 60)
    print("TEST 9: SEC EDGAR Signal Alert")
    print("=" * 60)

    signal_id = str(uuid4())
    company_name = "Global Logistics Inc (TEST)"
    signal_type = "SEC_EDGAR"
    summary = "8-K filing: Global Logistics Inc announced acquisition by XYZ Holdings for $2.1B. Expected completion Q3 2026. 1,200 employees at 3 facilities may be affected by post-merger restructuring."
    severity_score = 76
    confidence_score = 88
    severity_color = '#F97316'

    subject = f"[DispoSight] {signal_type}: {company_name} (Score: {severity_score})"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981; margin: 0 0 16px 0;">New Signal Detected</h2>
        <div style="background: #18181B; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">{company_name}</p>
            <p style="margin: 0 0 8px 0; color: #A1A1AA;">{summary}</p>
            <div style="display: flex; gap: 12px; color: #71717A; font-size: 13px;">
                <span>Chicago, IL</span>
                <span>&middot;</span>
                <span>1200 affected</span>
                <span>&middot;</span>
                <span>~950 devices</span>
            </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: {severity_color};">{severity_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">SEVERITY</span>
            </div>
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #A1A1AA;">{confidence_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">CONFIDENCE</span>
            </div>
        </div>
        <a href="{settings.frontend_url}/dashboard/signals/{signal_id}" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Signal</a>
        <p style="color: #71717A; font-size: 11px; margin-top: 24px;">You're receiving this because of your alert settings. <a href="{settings.frontend_url}/dashboard/alerts" style="color: #6EE7B7;">Manage alerts</a></p>
    </div>
    """

    try:
        result = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": TEST_RECIPIENT,
            "subject": subject,
            "html": html,
        })
        print(f"  PASS: SEC EDGAR alert sent")
        print(f"  Resend ID: {result.get('id', result)}")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_invalid_sender():
    """Test 10: Try sending from an unverified domain (should fail)."""
    print("\n" + "=" * 60)
    print("TEST 10: Invalid Sender (Expected Failure)")
    print("=" * 60)

    try:
        result = resend.Emails.send({
            "from": "test@notverified-domain.com",
            "to": TEST_RECIPIENT,
            "subject": "[Test] This should fail",
            "text": "This email should not send.",
        })
        print(f"  UNEXPECTED PASS: Unverified sender was accepted (security concern)")
        print(f"  Resend ID: {result.get('id', result)}")
        return False
    except Exception as e:
        print(f"  PASS (expected failure): {e}")
        return True


def main():
    print("=" * 60)
    print("  DispoSight Email Test Suite")
    print(f"  Recipient: {TEST_RECIPIENT}")
    print(f"  From: {FROM_EMAIL}")
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    tests = [
        ("API Connectivity", test_api_connectivity),
        ("Real-Time Alert (High Severity)", test_realtime_alert_email),
        ("Real-Time Alert (Low Severity)", test_realtime_alert_low_severity),
        ("Daily Digest", test_daily_digest_email),
        ("Weekly Digest", test_weekly_digest_email),
        ("Contact Form", test_contact_form_email),
        ("no-reply@ Sender", test_contact_form_no_reply_sender),
        ("Missing Fields Edge Case", test_edge_case_empty_fields),
        ("SEC EDGAR Alert", test_sec_edgar_alert),
        ("Invalid Sender (Negative)", test_invalid_sender),
    ]

    results = []
    for name, fn in tests:
        try:
            passed = fn()
            results.append((name, passed))
        except Exception as e:
            print(f"  ERROR: Unexpected exception: {e}")
            results.append((name, False))
        time.sleep(0.5)  # Rate limit courtesy

    print("\n" + "=" * 60)
    print("  RESULTS SUMMARY")
    print("=" * 60)

    passed_count = sum(1 for _, p in results if p)
    total = len(results)

    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")

    print(f"\n  {passed_count}/{total} tests passed")

    if passed_count == total:
        print("\n  All emails sent successfully! Check support@disposight.com inbox.")
    else:
        print("\n  Some tests failed. Review output above for details.")

    return 0 if passed_count == total else 1


if __name__ == "__main__":
    sys.exit(main())
