"""add_pipeline_workflow

Revision ID: b5d8e3f1a7c9
Revises: a3e7f1b2c4d6
Create Date: 2026-02-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b5d8e3f1a7c9'
down_revision: Union[str, Sequence[str], None] = 'a3e7f1b2c4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to watchlists
    op.add_column('watchlists', sa.Column('priority', sa.String(length=20), server_default='medium', nullable=False))
    op.add_column('watchlists', sa.Column('follow_up_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('watchlists', sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('watchlists', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('watchlists', sa.Column('lost_reason', sa.String(length=255), nullable=True))

    # Add indexes on watchlists
    op.create_index('ix_watchlists_follow_up_at', 'watchlists', ['follow_up_at'])
    op.create_index('ix_watchlists_status', 'watchlists', ['status'])

    # Create pipeline_activities table
    op.create_table(
        'pipeline_activities',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('watchlist_id', UUID(as_uuid=True), sa.ForeignKey('watchlists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('activity_type', sa.String(30), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('old_value', sa.String(100), nullable=True),
        sa.Column('new_value', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_pipeline_activities_watchlist_id', 'pipeline_activities', ['watchlist_id'])
    op.create_index('ix_pipeline_activities_tenant_id', 'pipeline_activities', ['tenant_id'])

    # Data migration: map old statuses to new pipeline stages
    op.execute("UPDATE watchlists SET status = 'identified' WHERE status = 'watching'")
    op.execute("UPDATE watchlists SET status = 'researching' WHERE status = 'claimed'")
    # 'contacted' stays as-is
    op.execute("""
        UPDATE watchlists
        SET status = 'lost',
            closed_at = NOW(),
            lost_reason = 'Migrated from legacy status'
        WHERE status = 'passed'
    """)

    # Seed last_activity_at from claimed_at where available
    op.execute("UPDATE watchlists SET last_activity_at = claimed_at WHERE claimed_at IS NOT NULL")

    # Change default status
    op.alter_column('watchlists', 'status', server_default='identified')


def downgrade() -> None:
    # Reverse status migration
    op.alter_column('watchlists', 'status', server_default='watching')
    op.execute("UPDATE watchlists SET status = 'watching' WHERE status = 'identified'")
    op.execute("UPDATE watchlists SET status = 'claimed' WHERE status = 'researching'")
    op.execute("UPDATE watchlists SET status = 'passed' WHERE status = 'lost'")
    op.execute("UPDATE watchlists SET status = 'watching' WHERE status = 'negotiating'")
    op.execute("UPDATE watchlists SET status = 'contacted' WHERE status = 'won'")

    # Drop pipeline_activities table
    op.drop_index('ix_pipeline_activities_tenant_id', 'pipeline_activities')
    op.drop_index('ix_pipeline_activities_watchlist_id', 'pipeline_activities')
    op.drop_table('pipeline_activities')

    # Drop indexes
    op.drop_index('ix_watchlists_status', 'watchlists')
    op.drop_index('ix_watchlists_follow_up_at', 'watchlists')

    # Remove new columns
    op.drop_column('watchlists', 'lost_reason')
    op.drop_column('watchlists', 'closed_at')
    op.drop_column('watchlists', 'last_activity_at')
    op.drop_column('watchlists', 'follow_up_at')
    op.drop_column('watchlists', 'priority')
