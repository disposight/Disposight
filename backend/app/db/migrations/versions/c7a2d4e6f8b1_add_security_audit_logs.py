"""add_security_audit_logs

Revision ID: c7a2d4e6f8b1
Revises: b5d8e3f1a7c9
Create Date: 2026-02-17 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'c7a2d4e6f8b1'
down_revision: Union[str, Sequence[str], None] = 'b5d8e3f1a7c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'security_audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('overall_status', sa.String(20), nullable=False),
        sa.Column('checks', JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_audit_logs_created_at', 'security_audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_security_audit_logs_created_at')
    op.drop_table('security_audit_logs')
