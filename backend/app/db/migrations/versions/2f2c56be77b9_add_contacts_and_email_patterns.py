"""add_contacts_and_email_patterns

Revision ID: 2f2c56be77b9
Revises:
Create Date: 2026-02-13 12:53:41.920071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f2c56be77b9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add contacts and email_patterns tables, contacts_found_at column."""
    op.create_table('email_patterns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('pattern', sa.String(length=100), nullable=True),
        sa.Column('mx_valid', sa.Boolean(), nullable=True),
        sa.Column('has_catch_all', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_email_patterns_domain'), 'email_patterns', ['domain'], unique=True)

    op.create_table('contacts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=500), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=True),
        sa.Column('seniority_level', sa.String(length=50), nullable=True),
        sa.Column('decision_maker_score', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(length=500), nullable=True),
        sa.Column('email_status', sa.String(length=50), server_default='unverified', nullable=False),
        sa.Column('email_pattern_used', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('linkedin_url', sa.Text(), nullable=True),
        sa.Column('discovery_source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contacts_company_id'), 'contacts', ['company_id'], unique=False)

    op.add_column('companies', sa.Column('contacts_found_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove contacts and email_patterns tables, contacts_found_at column."""
    op.drop_column('companies', 'contacts_found_at')
    op.drop_index(op.f('ix_contacts_company_id'), table_name='contacts')
    op.drop_table('contacts')
    op.drop_index(op.f('ix_email_patterns_domain'), table_name='email_patterns')
    op.drop_table('email_patterns')
