"""Admin-only endpoints: security audit, system management."""

from fastapi import APIRouter, Request
from sqlalchemy import select, text

from app.api.v1.deps import AdminUserId, DbSession
from app.rate_limit import limiter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/security-audit")
@limiter.limit("2/minute")
async def run_security_audit(request: Request, user_id: AdminUserId, db: DbSession):
    """Run all security checks and return report. Admin-only."""
    from app.security.auditor import SecurityAuditor

    auditor = SecurityAuditor()
    report = await auditor.run_all_checks()

    # Store in audit log
    await db.execute(
        text(
            "INSERT INTO security_audit_logs (id, overall_status, checks, created_at) "
            "VALUES (gen_random_uuid(), :status, :checks::jsonb, now())"
        ),
        {"status": report.overall_status, "checks": __import__("json").dumps(report.to_dict()["checks"])},
    )

    return report.to_dict()


@router.get("/security-audit/history")
@limiter.limit("10/minute")
async def get_audit_history(request: Request, user_id: AdminUserId, db: DbSession):
    """Get past security audit results. Admin-only."""
    result = await db.execute(
        text(
            "SELECT id, overall_status, checks, created_at "
            "FROM security_audit_logs ORDER BY created_at DESC LIMIT 50"
        )
    )
    rows = result.fetchall()
    return [
        {
            "id": str(row[0]),
            "overall_status": row[1],
            "checks": row[2],
            "created_at": row[3].isoformat() if row[3] else None,
        }
        for row in rows
    ]
