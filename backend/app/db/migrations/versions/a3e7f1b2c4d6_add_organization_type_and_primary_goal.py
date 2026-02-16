"""add_organization_type_and_primary_goal

Revision ID: a3e7f1b2c4d6
Revises: 2f2c56be77b9
Create Date: 2026-02-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3e7f1b2c4d6'
down_revision: Union[str, Sequence[str], None] = '2f2c56be77b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add organization_type and primary_goal columns to users table."""
    op.add_column('users', sa.Column('organization_type', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('primary_goal', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove organization_type and primary_goal columns from users table."""
    op.drop_column('users', 'primary_goal')
    op.drop_column('users', 'organization_type')
