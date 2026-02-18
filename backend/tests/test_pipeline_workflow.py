"""Tests for pipeline workflow: status validation, activity schemas, follow-up logic."""

import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from pydantic import ValidationError

from app.schemas.watchlist import (
    VALID_STATUSES,
    VALID_PRIORITIES,
    WatchlistStatusUpdate,
    WatchlistPriorityUpdate,
    WatchlistFollowUpUpdate,
    PipelineActivityCreate,
    PipelineActivityOut,
    FollowUpItem,
    PipelineSummary,
)


# --- Status validation ---

def test_valid_statuses_accepted():
    for status in VALID_STATUSES:
        update = WatchlistStatusUpdate(status=status, lost_reason="test" if status == "lost" else None)
        assert update.status == status


def test_old_statuses_rejected():
    for old_status in ("watching", "claimed", "passed"):
        with pytest.raises(ValidationError):
            WatchlistStatusUpdate(status=old_status)


def test_lost_status_accepted_with_reason():
    update = WatchlistStatusUpdate(status="lost", lost_reason="No asset opportunity")
    assert update.status == "lost"
    assert update.lost_reason == "No asset opportunity"


# --- Priority validation ---

def test_valid_priorities_accepted():
    for priority in VALID_PRIORITIES:
        update = WatchlistPriorityUpdate(priority=priority)
        assert update.priority == priority


def test_invalid_priority_rejected():
    with pytest.raises(ValidationError):
        WatchlistPriorityUpdate(priority="critical")


# --- Activity creation validation ---

def test_valid_activity_types():
    for activity_type in ("note", "call", "email", "meeting"):
        activity = PipelineActivityCreate(activity_type=activity_type, title="Test")
        assert activity.activity_type == activity_type


def test_invalid_activity_type_rejected():
    with pytest.raises(ValidationError):
        PipelineActivityCreate(activity_type="status_change", title="Test")


def test_activity_create_requires_title():
    with pytest.raises(ValidationError):
        PipelineActivityCreate(activity_type="note")


# --- Activity output ---

def test_activity_out_model():
    now = datetime.now(timezone.utc)
    activity = PipelineActivityOut(
        id=uuid4(),
        watchlist_id=uuid4(),
        user_id=uuid4(),
        activity_type="status_change",
        title="Status changed from identified to researching",
        old_value="identified",
        new_value="researching",
        created_at=now,
        user_name="Jane Doe",
    )
    assert activity.old_value == "identified"
    assert activity.new_value == "researching"
    assert activity.user_name == "Jane Doe"


# --- Follow-up ---

def test_follow_up_set():
    future = datetime.now(timezone.utc) + timedelta(days=3)
    update = WatchlistFollowUpUpdate(follow_up_at=future)
    assert update.follow_up_at is not None


def test_follow_up_clear():
    update = WatchlistFollowUpUpdate(follow_up_at=None)
    assert update.follow_up_at is None


def test_follow_up_item_overdue():
    past = datetime.now(timezone.utc) - timedelta(days=2)
    item = FollowUpItem(
        watchlist_id=uuid4(),
        company_id=uuid4(),
        company_name="Test Corp",
        follow_up_at=past,
        status="researching",
        priority="high",
        is_overdue=True,
        days_until=-2,
    )
    assert item.is_overdue is True
    assert item.days_until == -2


def test_follow_up_item_future():
    future = datetime.now(timezone.utc) + timedelta(days=5)
    item = FollowUpItem(
        watchlist_id=uuid4(),
        company_id=uuid4(),
        company_name="Future Corp",
        follow_up_at=future,
        status="contacted",
        priority="medium",
        is_overdue=False,
        days_until=5,
    )
    assert item.is_overdue is False
    assert item.days_until == 5


# --- Pipeline summary ---

def test_pipeline_summary_model():
    summary = PipelineSummary(
        total=25,
        by_status={"identified": 5, "researching": 8, "contacted": 6, "negotiating": 3, "won": 2, "lost": 1},
        overdue_follow_ups=3,
        won_this_month=2,
        lost_this_month=1,
    )
    assert summary.total == 25
    assert summary.by_status["researching"] == 8
    assert summary.overdue_follow_ups == 3
    assert summary.won_this_month == 2
    assert summary.lost_this_month == 1


def test_pipeline_summary_defaults():
    summary = PipelineSummary()
    assert summary.total == 0
    assert summary.by_status == {}
    assert summary.overdue_follow_ups == 0
