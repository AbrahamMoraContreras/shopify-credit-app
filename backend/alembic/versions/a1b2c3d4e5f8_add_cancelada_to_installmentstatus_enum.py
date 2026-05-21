"""add CANCELADA to installmentstatus enum

Revision ID: a1b2c3d4e5f8
Revises: a1b2c3d4e5f7
Create Date: 2026-05-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f8'
down_revision: Union[str, Sequence[str], None] = 'merge_025_a1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE installmentstatus ADD VALUE IF NOT EXISTS 'CANCELADA'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
