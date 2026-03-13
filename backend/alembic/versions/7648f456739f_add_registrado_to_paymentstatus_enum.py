"""add_registrado_to_paymentstatus_enum

Revision ID: 7648f456739f
Revises: 468396d3ef3c
Create Date: 2026-03-12 19:36:03.822509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7648f456739f'
down_revision: Union[str, Sequence[str], None] = '468396d3ef3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Postgres doesn't allow ALTER TYPE inside a transaction block if we try to use it right away, 
    # but `op.execute` with `COMMIT` works.
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'REGISTRADO'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
