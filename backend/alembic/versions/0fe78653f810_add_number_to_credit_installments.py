"""add number to credit_installments

Revision ID: 0fe78653f810
Revises: 24dd728df026
Create Date: 2025-12-22 23:21:38.740944

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0fe78653f810'
down_revision: Union[str, Sequence[str], None] = '24dd728df026'
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