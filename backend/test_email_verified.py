"""
Test emails with verified disposight.com domain.
Sends FROM support@disposight.com TO support@disposight.com.
"""

import time
from datetime import datetime, timezone
from uuid import uuid4

import resend
from dotenv import load_dotenv

load_dotenv()

from app.config import settings

resend.api_key = settings.resend_api_key

TO = "support@disposight.com"
FROM = "DispoSight <support@disposight.com>"
FROM_NOREPLY = "DispoSight <no-reply@disposight.com>"
FRONTEND = settings.frontend_url


def send_realtime_alert():
    """Real-time alert — High priority."""
    signal_id = str(uuid4())
    subject = "New Signal: Amazon — WARN Act (Memphis, TN)"

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:24px 32px 16px 32px;border-bottom:1px solid #E4E4E7;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><span style="font-size:18px;font-weight:700;color:#09090B;letter-spacing:-0.3px;">DispoSight</span></td>
            <td align="right"><span style="display:inline-block;background-color:#DC2626;color:#FFFFFF;font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;">High Priority</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#09090B;line-height:1.3;">Amazon</h1>
          <p style="margin:0 0 20px 0;font-size:13px;color:#71717A;">WARN Act &nbsp;&bull;&nbsp; Memphis, TN &nbsp;&bull;&nbsp; Feb 11, 2026</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#3F3F46;line-height:1.6;">WARN Act filing indicates closure of fulfillment center in Memphis, TN affecting approximately 620 employees. Closure expected by April 2026.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="50%" style="padding:12px 16px;background-color:#FAFAFA;border-radius:6px 0 0 0;">
                <span style="display:block;font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Employees Affected</span>
                <span style="font-size:20px;font-weight:700;color:#09090B;">620</span>
              </td>
              <td width="50%" style="padding:12px 16px;background-color:#FAFAFA;border-radius:0 6px 0 0;">
                <span style="display:block;font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Est. Devices</span>
                <span style="font-size:20px;font-weight:700;color:#09090B;">~500</span>
              </td>
            </tr>
            <tr><td colspan="2" style="padding:12px 16px;background-color:#FAFAFA;border-radius:0 0 6px 6px;border-top:1px solid #E4E4E7;">
              <span style="display:block;font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Source</span>
              <span style="font-size:14px;font-weight:500;color:#3F3F46;">Tennessee Dept. of Labor</span>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#09090B;border-radius:6px;">
              <a href="{FRONTEND}/dashboard/signals/{signal_id}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">View Full Details</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #E4E4E7;background-color:#FAFAFA;">
          <p style="margin:0;font-size:12px;color:#A1A1AA;line-height:1.5;">You're receiving this alert based on your notification preferences. <a href="{FRONTEND}/dashboard/alerts" style="color:#71717A;text-decoration:underline;">Manage alerts</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    result = resend.Emails.send({"from": FROM, "to": TO, "subject": subject, "html": html})
    print(f"[SENT] Real-time alert (High) — ID: {result.get('id', result)}")


def send_daily_digest():
    """Daily digest — Executive Briefing style."""
    signals = [
        ("Amazon", "Fulfillment center closure in Memphis, TN — 620 employees affected", "WARN Act", "High", "#DC2626"),
        ("Meta Platforms", "Restructuring of Reality Labs division across multiple facilities", "News", "High", "#DC2626"),
        ("Macy's Inc", "SEC filing indicates consolidation of 3 Northeast distribution centers", "SEC EDGAR", "Medium", "#EA580C"),
        ("Wells Fargo", "WARN notice for 280 employees at Charlotte, NC operations center", "WARN Act", "Medium", "#EA580C"),
        ("Thermo Fisher", "Chapter 11 filing for subsidiary laboratory equipment division", "Court Filing", "Medium", "#EA580C"),
    ]

    signal_html = ""
    for i, (company, summary, sig_type, priority, color) in enumerate(signals):
        border = 'border-bottom:1px solid #E4E4E7;' if i < len(signals) - 1 else ''
        signal_html += f"""
        <tr><td style="padding:16px 0;{border}">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <span style="font-size:15px;font-weight:600;color:#09090B;">{company}</span>
              <span style="display:inline-block;background-color:{color};color:#FFFFFF;font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;text-transform:uppercase;letter-spacing:0.3px;margin-left:8px;vertical-align:middle;">{priority}</span>
            </td></tr>
            <tr><td style="padding-top:4px;"><span style="font-size:13px;color:#52525B;line-height:1.5;">{summary}</span></td></tr>
            <tr><td style="padding-top:4px;"><span style="font-size:11px;color:#A1A1AA;">{sig_type}</span></td></tr>
          </table>
        </td></tr>"""

    subject = "Your Daily Brief — 8 new signals"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:24px 32px 16px 32px;border-bottom:1px solid #E4E4E7;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td><span style="font-size:18px;font-weight:700;color:#09090B;letter-spacing:-0.3px;">DispoSight</span></td>
            <td align="right"><span style="font-size:13px;color:#71717A;">February 11, 2026</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#09090B;line-height:1.3;">Daily Intelligence Brief</h1>
          <p style="margin:0 0 24px 0;font-size:15px;color:#52525B;line-height:1.5;">We detected <strong>8 new signals</strong> in the last 24 hours. Here are the top opportunities:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">{signal_html}</table>
          <p style="margin:0 0 24px 0;font-size:13px;color:#71717A;">+ 3 more signals on your dashboard</p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#09090B;border-radius:6px;">
              <a href="{FRONTEND}/dashboard" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">Open Dashboard</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #E4E4E7;background-color:#FAFAFA;">
          <p style="margin:0;font-size:12px;color:#A1A1AA;line-height:1.5;">You're receiving this daily digest based on your notification preferences. <a href="{FRONTEND}/dashboard/alerts" style="color:#71717A;text-decoration:underline;">Manage alerts</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    result = resend.Emails.send({"from": FROM_NOREPLY, "to": TO, "subject": subject, "html": html})
    print(f"[SENT] Daily digest — ID: {result.get('id', result)}")


def send_contact_form():
    """Contact form submission."""
    subject = "[Contact] Enterprise Plan Inquiry — Sarah Mitchell"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:24px 32px 16px 32px;border-bottom:1px solid #E4E4E7;">
          <span style="font-size:18px;font-weight:700;color:#09090B;letter-spacing:-0.3px;">DispoSight</span>
          <span style="font-size:13px;color:#71717A;margin-left:12px;">Contact Form</span>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#09090B;">Enterprise Plan Inquiry</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#FAFAFA;border-radius:6px;">
            <tr><td style="padding:12px 16px;border-bottom:1px solid #E4E4E7;">
              <span style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">From</span><br>
              <span style="font-size:14px;color:#09090B;font-weight:500;">Sarah Mitchell</span>
            </td></tr>
            <tr><td style="padding:12px 16px;">
              <span style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
              <a href="mailto:s.mitchell@acme-liquidation.com" style="font-size:14px;color:#2563EB;text-decoration:none;">s.mitchell@acme-liquidation.com</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:15px;color:#3F3F46;line-height:1.7;">Hi, I'm the VP of Business Development at Acme Liquidation. We handle about 15,000 devices per quarter across 12 states. I'm interested in the Enterprise plan, particularly the API access and custom alert configurations. Can we schedule a demo?</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #E4E4E7;background-color:#FAFAFA;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#2563EB;border-radius:6px;">
              <a href="mailto:s.mitchell@acme-liquidation.com" style="display:inline-block;padding:10px 24px;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Reply to Sarah</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    result = resend.Emails.send({"from": FROM_NOREPLY, "to": TO, "reply_to": "s.mitchell@acme-liquidation.com", "subject": subject, "html": html})
    print(f"[SENT] Contact form — ID: {result.get('id', result)}")


if __name__ == "__main__":
    print("Sending with verified domain (support@disposight.com)...\n")

    send_realtime_alert()
    time.sleep(0.5)
    send_daily_digest()
    time.sleep(0.5)
    send_contact_form()

    print(f"\nDone! Check support@disposight.com for 3 emails:")
    print("  1. Real-time alert (from support@disposight.com)")
    print("  2. Daily digest (from no-reply@disposight.com)")
    print("  3. Contact form (from no-reply@disposight.com)")
