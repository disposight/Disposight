"""Scheduled security audit worker — runs every 6 hours via ARQ cron."""

import json

import resend
import structlog
from sqlalchemy import text

from app.config import settings

logger = structlog.get_logger()

resend.api_key = settings.resend_api_key


async def run_security_audit(ctx):
    """Run all security checks, store results, and alert admins on failures."""
    from app.db.session import async_session_factory
    from app.security.auditor import SecurityAuditor

    auditor = SecurityAuditor()
    report = await auditor.run_all_checks()
    report_dict = report.to_dict()

    # Store in DB
    async with async_session_factory() as db:
        await db.execute(
            text(
                "INSERT INTO security_audit_logs (id, overall_status, checks, created_at) "
                "VALUES (gen_random_uuid(), :status, :checks::jsonb, now())"
            ),
            {"status": report.overall_status, "checks": json.dumps(report_dict["checks"])},
        )
        await db.commit()

    logger.info(
        "security_audit_worker_complete",
        overall_status=report.overall_status,
        passed=report_dict["summary"]["passed"],
        warnings=report_dict["summary"]["warnings"],
        failures=report_dict["summary"]["failures"],
    )

    # Alert admins if any check failed
    if report.overall_status == "fail" and settings.admin_emails and settings.resend_api_key:
        admin_list = [e.strip() for e in settings.admin_emails.split(",") if e.strip()]
        failed_checks = [c for c in report.checks if c.status == "fail"]
        check_lines = "\n".join(f"  - [{c.severity}] {c.name}: {c.message}" for c in failed_checks)

        try:
            resend.Emails.send({
                "from": settings.from_email,
                "to": admin_list,
                "subject": f"[DispoSight] Security Audit FAILED — {len(failed_checks)} issue(s)",
                "text": (
                    f"Security audit completed at {report.run_at}\n"
                    f"Overall status: {report.overall_status}\n\n"
                    f"Failed checks:\n{check_lines}\n\n"
                    "Review at: https://disposight.com/dashboard/admin/security"
                ),
            })
            logger.info("security_audit_alert_sent", recipients=len(admin_list))
        except Exception as e:
            logger.error("security_audit_alert_failed", error=str(e))
