"""Add new payment methods

Revision ID: a1b2c3d4e5f7
Revises: f09b4038d1a3
Create Date: 2026-04-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = '9aa7a4a8741a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns if they don't exist
    conn = op.get_bind()
    
    # We use IF NOT EXISTS workaround or just add_column directly
    # Render might run this, or I will run it manually. To be safe:
    op.execute('ALTER TABLE merchants ADD COLUMN IF NOT EXISTS binance_settings JSONB')
    op.execute('ALTER TABLE merchants ADD COLUMN IF NOT EXISTS zelle_settings JSONB')
    op.execute('ALTER TABLE merchants ADD COLUMN IF NOT EXISTS zinli_settings JSONB')
    op.execute('ALTER TABLE merchants ADD COLUMN IF NOT EXISTS debito_settings JSONB')


def downgrade() -> None:
    op.drop_column('merchants', 'binance_settings')
    op.drop_column('merchants', 'zelle_settings')
    op.drop_column('merchants', 'zinli_settings')
    op.drop_column('merchants', 'debito_settings')
