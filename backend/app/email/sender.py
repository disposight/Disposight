from datetime import datetime, timedelta, timezone

import resend
import structlog
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Alert, AlertHistory, Company, Signal, User, Watchlist

logger = structlog.get_logger()

resend.api_key = settings.resend_api_key

RATE_CAP_PER_DAY = 20


def _signal_matches_alert(signal: Signal, alert: Alert) -> bool:
    """Check if a signal matches an alert's filter criteria."""
    if alert.signal_types and signal.signal_type not in alert.signal_types:
        return False
    if signal.confidence_score < alert.min_confidence_score:
        return False
    if signal.severity_score < alert.min_severity_score:
        return False
    if alert.states and signal.location_state and signal.location_state not in alert.states:
        return False
    if alert.company_ids and signal.company_id not in alert.company_ids:
        return False
    return True


async def _is_rate_capped(db: AsyncSession, user_id) -> bool:
    """Check if a user has exceeded the daily email rate cap."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    result = await db.execute(
        select(sa_func.count())
        .select_from(AlertHistory)
        .where(
            AlertHistory.user_id == user_id,
            AlertHistory.delivery_status == "sent",
            AlertHistory.created_at >= cutoff,
        )
    )
    count = result.scalar_one()
    return count >= RATE_CAP_PER_DAY


async def match_and_send_realtime_alerts(db: AsyncSession, signal: Signal) -> int:
    """Match a signal against all active real-time alerts and send emails."""
    result = await db.execute(
        select(Alert).where(Alert.frequency == "realtime", Alert.is_active == True)
    )
    alerts = result.scalars().all()

    sent = 0
    for alert in alerts:
        if not _signal_matches_alert(signal, alert):
            continue

        # watchlist_only: signal's company must be on the alert owner's tenant watchlist
        if alert.watchlist_only:
            wl_result = await db.execute(
                select(Watchlist.id).where(
                    Watchlist.tenant_id == alert.tenant_id,
                    Watchlist.company_id == signal.company_id,
                ).limit(1)
            )
            if not wl_result.scalar_one_or_none():
                continue

        user = await db.get(User, alert.user_id)
        if not user:
            continue

        if await _is_rate_capped(db, user.id):
            logger.warning("email.rate_capped", user_id=str(user.id))
            continue

        await send_signal_alert(db, signal, alert, user)
        sent += 1

    if sent:
        logger.info("alerts.realtime_matched", signal_id=str(signal.id), sent=sent)

    return sent


async def send_signal_alert(db: AsyncSession, signal: Signal, alert: Alert, user: User):
    """Send a real-time signal alert email."""
    if not settings.resend_api_key:
        logger.warning("email.skipped", reason="no_resend_key")
        return

    company = await db.get(Company, signal.company_id)
    company_name = company.name if company else "Unknown Company"

    subject = f"[DispoSight] {signal.signal_type.upper()}: {company_name} (Score: {signal.severity_score})"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
        <h2 style="color: #10B981; margin: 0 0 16px 0;">New Signal Detected</h2>
        <div style="background: #18181B; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">{company_name}</p>
            <p style="margin: 0 0 8px 0; color: #A1A1AA;">{signal.summary or signal.title}</p>
            <div style="display: flex; gap: 12px; color: #71717A; font-size: 13px;">
                <span>{signal.location_city or ''}{', ' + signal.location_state if signal.location_state else ''}</span>
                <span>·</span>
                <span>{signal.affected_employees or '?'} affected</span>
                <span>·</span>
                <span>~{signal.device_estimate or '?'} devices</span>
            </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: {'#EF4444' if signal.severity_score >= 80 else '#F97316' if signal.severity_score >= 60 else '#EAB308'};">{signal.severity_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">SEVERITY</span>
            </div>
            <div style="text-align: center;">
                <span style="font-size: 24px; font-weight: 700; font-family: monospace; color: #A1A1AA;">{signal.confidence_score}</span>
                <br><span style="font-size: 11px; color: #71717A;">CONFIDENCE</span>
            </div>
        </div>
        <a href="{settings.frontend_url}/dashboard/signals/{signal.id}" style="display: inline-block; background: #10B981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Signal</a>
        <p style="color: #71717A; font-size: 11px; margin-top: 24px;">You're receiving this because of your alert settings. <a href="{settings.frontend_url}/dashboard/alerts" style="color: #6EE7B7;">Manage alerts</a></p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.from_email,
            "to": user.email,
            "subject": subject,
            "html": html,
        })

        history = AlertHistory(
            alert_id=alert.id,
            tenant_id=alert.tenant_id,
            user_id=user.id,
            signal_id=signal.id,
            delivery_status="sent",
            subject=subject,
            delivered_at=datetime.now(timezone.utc),
        )
        db.add(history)

        logger.info("email.sent", user=user.email, signal_id=str(signal.id))

    except Exception as e:
        history = AlertHistory(
            alert_id=alert.id,
            tenant_id=alert.tenant_id,
            user_id=user.id,
            signal_id=signal.id,
            delivery_status="failed",
            subject=subject,
            error_message=str(e)[:500],
        )
        db.add(history)
        logger.error("email.failed", user=user.email, error=str(e))


async def send_digest(db: AsyncSession, frequency: str = "daily"):
    """Send digest emails to all users with matching alert frequency."""
    if not settings.resend_api_key:
        logger.warning("email.digest_skipped", reason="no_resend_key")
        return

    hours = 24 if frequency == "daily" else 168
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Get recent signals
    result = await db.execute(
        select(Signal)
        .where(Signal.created_at >= cutoff)
        .order_by(Signal.severity_score.desc())
        .limit(20)
    )
    signals = result.scalars().all()

    if not signals:
        return

    # Get alerts with matching frequency
    result = await db.execute(
        select(Alert).where(Alert.frequency == frequency, Alert.is_active == True)
    )
    alerts = result.scalars().all()

    for alert in alerts:
        user = await db.get(User, alert.user_id)
        if not user:
            continue

        # Filter signals to only those matching this alert's criteria
        matched = [s for s in signals if _signal_matches_alert(s, alert)]
        if not matched:
            continue

        subject = f"[DispoSight] {'Daily' if frequency == 'daily' else 'Weekly'} Intelligence Digest — {len(matched)} signals"

        signal_rows = ""
        for s in matched[:10]:
            company = await db.get(Company, s.company_id)
            color = "#EF4444" if s.severity_score >= 80 else "#F97316" if s.severity_score >= 60 else "#EAB308" if s.severity_score >= 40 else "#22C55E"
            signal_rows += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #27272A;">{company.name if company else '?'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #27272A;">{s.signal_type}</td>
                <td style="padding: 8px; border-bottom: 1px solid #27272A; font-family: monospace; color: {color};">{s.severity_score}</td>
            </tr>
            """

        html = f"""
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #09090B; color: #FAFAFA; padding: 24px; border-radius: 8px;">
            <h2 style="color: #10B981;">Intelligence Digest</h2>
            <p style="color: #A1A1AA;">{len(matched)} new signals in the last {'24 hours' if frequency == 'daily' else 'week'}.</p>
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
            resend.Emails.send({
                "from": settings.from_email,
                "to": user.email,
                "subject": subject,
                "html": html,
            })
            logger.info("email.digest_sent", user=user.email, frequency=frequency)
        except Exception as e:
            logger.error("email.digest_failed", user=user.email, error=str(e))
