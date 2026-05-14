"""merge heads

Revision ID: merge_025_a1b
Revises: 025192e8ffa0, a1b2c3d4e5f7
Create Date: 2026-05-14 02:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_025_a1b'
down_revision: Union[str, Sequence[str], None] = ('025192e8ffa0', 'a1b2c3d4e5f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
