"""add number to credit_installments

Revision ID: 24dd728df026
Revises: f09b4038d1a3
Create Date: 2025-12-22 23:01:28.713420

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24dd728df026'
down_revision: Union[str, Sequence[str], None] = 'f09b4038d1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "credit_installments",
        sa.Column(
            "number",
            sa.Integer(),
            nullable=False,
            server_default="1"
        )
    )


def downgrade():
    op.drop_column("credit_installments", "number")