"""
Test redesigned email templates — Executive Briefing style.
Sends to disposight@gmail.com via Resend test sender.
"""

import time
from datetime import datetime, timezone
from uuid import uuid4

import resend
from dotenv import load_dotenv

load_dotenv()

from app.config import settings

resend.api_key = settings.resend_api_key

TO = "disposight@gmail.com"
FROM = "onboarding@resend.dev"
FRONTEND = settings.frontend_url


def send_realtime_alert_v2():
    """New design: Executive Briefing style real-time alert."""

    signal_id = str(uuid4())
    company = "Amazon"
    summary = "WARN Act filing indicates closure of fulfillment center in Memphis, TN affecting approximately 620 employees. Closure expected by April 2026."
    signal_type = "WARN Act"
    location = "Memphis, TN"
    employees = "620"
    devices_est = "~500"
    priority = "High"
    priority_color = "#DC2626"  # red-600
    source = "Tennessee Dept. of Labor"
    detected = "Feb 11, 2026 at 3:08 PM UTC"

    subject = f"New Signal: {company} — {signal_type} ({location})"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #E4E4E7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 700; color: #09090B; letter-spacing: -0.3px;">DispoSight</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: {priority_color}; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">{priority} Priority</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px;">

              <!-- Company name -->
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #09090B; line-height: 1.3;">{company}</h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #71717A;">{signal_type} &nbsp;&bull;&nbsp; {location} &nbsp;&bull;&nbsp; {detected}</p>

              <!-- Summary -->
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #3F3F46; line-height: 1.6;">{summary}</p>

              <!-- Key details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="50%" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 6px 0 0 0;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Employees Affected</span>
                    <span style="font-size: 20px; font-weight: 700; color: #09090B;">{employees}</span>
                  </td>
                  <td width="50%" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 0 6px 0 0;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Est. Devices</span>
                    <span style="font-size: 20px; font-weight: 700; color: #09090B;">{devices_est}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 0 0 6px 6px; border-top: 1px solid #E4E4E7;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Source</span>
                    <span style="font-size: 14px; font-weight: 500; color: #3F3F46;">{source}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #09090B; border-radius: 6px;">
                    <a href="{FRONTEND}/dashboard/signals/{signal_id}" style="display: inline-block; padding: 12px 28px; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none;">View Full Details</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #E4E4E7; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 12px; color: #A1A1AA; line-height: 1.5;">
                You're receiving this alert based on your notification preferences.
                <a href="{FRONTEND}/dashboard/alerts" style="color: #71717A; text-decoration: underline;">Manage alerts</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    result = resend.Emails.send({"from": FROM, "to": TO, "subject": subject, "html": html})
    print(f"[SENT] Real-time alert v2 — ID: {result.get('id', result)}")


def send_realtime_alert_v2_medium():
    """Medium priority alert to show orange styling."""

    signal_id = str(uuid4())
    company = "Macy's Inc"
    summary = "SEC 8-K filing reveals planned restructuring of Northeast retail operations. Three distribution centers in New Jersey may be consolidated, with workforce reductions beginning Q3 2026."
    signal_type = "SEC EDGAR"
    location = "Newark, NJ"
    employees = "340"
    devices_est = "~280"
    priority = "Medium"
    priority_color = "#EA580C"  # orange-600
    source = "SEC EDGAR 8-K Filing"
    detected = "Feb 11, 2026 at 1:45 PM UTC"

    subject = f"New Signal: {company} — {signal_type} ({location})"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #E4E4E7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 700; color: #09090B; letter-spacing: -0.3px;">DispoSight</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: {priority_color}; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">{priority} Priority</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px;">
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #09090B; line-height: 1.3;">{company}</h1>
              <p style="margin: 0 0 20px 0; font-size: 13px; color: #71717A;">{signal_type} &nbsp;&bull;&nbsp; {location} &nbsp;&bull;&nbsp; {detected}</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #3F3F46; line-height: 1.6;">{summary}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="50%" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 6px 0 0 0;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Employees Affected</span>
                    <span style="font-size: 20px; font-weight: 700; color: #09090B;">{employees}</span>
                  </td>
                  <td width="50%" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 0 6px 0 0;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Est. Devices</span>
                    <span style="font-size: 20px; font-weight: 700; color: #09090B;">{devices_est}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px 16px; background-color: #FAFAFA; border-radius: 0 0 6px 6px; border-top: 1px solid #E4E4E7;">
                    <span style="display: block; font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Source</span>
                    <span style="font-size: 14px; font-weight: 500; color: #3F3F46;">{source}</span>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #09090B; border-radius: 6px;">
                    <a href="{FRONTEND}/dashboard/signals/{signal_id}" style="display: inline-block; padding: 12px 28px; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none;">View Full Details</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #E4E4E7; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 12px; color: #A1A1AA; line-height: 1.5;">
                You're receiving this alert based on your notification preferences.
                <a href="{FRONTEND}/dashboard/alerts" style="color: #71717A; text-decoration: underline;">Manage alerts</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    result = resend.Emails.send({"from": FROM, "to": TO, "subject": subject, "html": html})
    print(f"[SENT] Real-time alert v2 (medium) — ID: {result.get('id', result)}")


def send_digest_v2():
    """New design: Executive Briefing style daily digest."""

    signals = [
        {"company": "Amazon", "summary": "Fulfillment center closure in Memphis, TN — 620 employees affected", "type": "WARN Act", "priority": "High", "color": "#DC2626"},
        {"company": "Meta Platforms", "summary": "Restructuring of Reality Labs division reported across multiple facilities", "type": "News", "priority": "High", "color": "#DC2626"},
        {"company": "Macy's Inc", "summary": "SEC filing indicates planned consolidation of 3 Northeast distribution centers", "type": "SEC EDGAR", "priority": "Medium", "color": "#EA580C"},
        {"company": "Wells Fargo", "summary": "WARN notice filed for 280 employees at Charlotte, NC operations center", "type": "WARN Act", "priority": "Medium", "color": "#EA580C"},
        {"company": "Thermo Fisher", "summary": "Chapter 11 bankruptcy filing for subsidiary laboratory equipment division", "type": "Court Filing", "priority": "Medium", "color": "#EA580C"},
    ]

    total_signals = 8
    date_str = "February 11, 2026"

    subject = f"Your Daily Brief — {total_signals} new signals"

    # Build signal items
    signal_html = ""
    for i, s in enumerate(signals):
        border_bottom = 'border-bottom: 1px solid #E4E4E7;' if i < len(signals) - 1 else ''
        signal_html += f"""
        <tr>
          <td style="padding: 16px 0; {border_bottom}">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 15px; font-weight: 600; color: #09090B;">{s['company']}</span>
                  <span style="display: inline-block; background-color: {s['color']}; color: #FFFFFF; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.3px; margin-left: 8px; vertical-align: middle;">{s['priority']}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 4px;">
                  <span style="font-size: 13px; color: #52525B; line-height: 1.5;">{s['summary']}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 4px;">
                  <span style="font-size: 11px; color: #A1A1AA;">{s['type']}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """

    remaining = total_signals - len(signals)

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #E4E4E7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 700; color: #09090B; letter-spacing: -0.3px;">DispoSight</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 13px; color: #71717A;">{date_str}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px;">

              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #09090B; line-height: 1.3;">Daily Intelligence Brief</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #52525B; line-height: 1.5;">We detected <strong>{total_signals} new signals</strong> in the last 24 hours. Here are the top opportunities:</p>

              <!-- Signal list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                {signal_html}
              </table>

              {'<p style="margin: 0 0 24px 0; font-size: 13px; color: #71717A;">+ ' + str(remaining) + ' more signals on your dashboard</p>' if remaining > 0 else ''}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #09090B; border-radius: 6px;">
                    <a href="{FRONTEND}/dashboard" style="display: inline-block; padding: 12px 28px; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none;">Open Dashboard</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #E4E4E7; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 12px; color: #A1A1AA; line-height: 1.5;">
                You're receiving this daily digest based on your notification preferences.
                <a href="{FRONTEND}/dashboard/alerts" style="color: #71717A; text-decoration: underline;">Manage alerts</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    result = resend.Emails.send({"from": FROM, "to": TO, "subject": subject, "html": html})
    print(f"[SENT] Daily digest v2 — ID: {result.get('id', result)}")


def send_contact_form_v2():
    """Redesigned contact form notification."""

    name = "Sarah Mitchell"
    email = "s.mitchell@acme-liquidation.com"
    form_subject = "Enterprise Plan Inquiry"
    message = "Hi, I'm the VP of Business Development at Acme Liquidation. We handle about 15,000 devices per quarter across 12 states. I'm interested in the Enterprise plan, particularly the API access and custom alert configurations. Can we schedule a demo?"

    subject = f"[Contact] {form_subject} — {name}"

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <tr>
            <td style="padding: 24px 32px 16px 32px; border-bottom: 1px solid #E4E4E7;">
              <span style="font-size: 18px; font-weight: 700; color: #09090B; letter-spacing: -0.3px;">DispoSight</span>
              <span style="font-size: 13px; color: #71717A; margin-left: 12px;">Contact Form</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px;">
              <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #09090B;">{form_subject}</h1>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #FAFAFA; border-radius: 6px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #E4E4E7;">
                    <span style="font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px;">From</span><br>
                    <span style="font-size: 14px; color: #09090B; font-weight: 500;">{name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px;">
                    <span style="font-size: 11px; color: #71717A; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
                    <a href="mailto:{email}" style="font-size: 14px; color: #2563EB; text-decoration: none;">{email}</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; color: #3F3F46; line-height: 1.7; white-space: pre-line;">{message}</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #E4E4E7; background-color: #FAFAFA;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #2563EB; border-radius: 6px;">
                    <a href="mailto:{email}" style="display: inline-block; padding: 10px 24px; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none;">Reply to {name.split()[0]}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
"""

    result = resend.Emails.send({
        "from": FROM,
        "to": TO,
        "reply_to": email,
        "subject": subject,
        "html": html,
    })
    print(f"[SENT] Contact form v2 — ID: {result.get('id', result)}")


if __name__ == "__main__":
    print("Sending redesigned email templates...\n")

    send_realtime_alert_v2()
    time.sleep(0.5)

    send_realtime_alert_v2_medium()
    time.sleep(0.5)

    send_digest_v2()
    time.sleep(0.5)

    send_contact_form_v2()

    print("\nDone! Check disposight@gmail.com for 4 emails:")
    print("  1. Real-time alert (High priority — Amazon)")
    print("  2. Real-time alert (Medium priority — Macy's)")
    print("  3. Daily digest (8 signals, top 5 shown)")
    print("  4. Contact form submission")
