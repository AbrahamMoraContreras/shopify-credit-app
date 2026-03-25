"""add CANCELADO to paymentstatus enum

Revision ID: 5bb0b2aa8843
Revises: a1b2c3d4e5f6
Create Date: 2026-03-22 21:13:09.182192

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bb0b2aa8843'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'CANCELADO'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
