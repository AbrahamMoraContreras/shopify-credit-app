"""add installment_id foreign key to payments

Revision ID: f09b4038d1a3
Revises: 157176e33edf
Create Date: 2025-12-22 22:40:50.467454

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f09b4038d1a3'
down_revision: Union[str, Sequence[str], None] = '157176e33edf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "payments",
        sa.Column("installment_id", sa.Integer(), nullable=True)
    )

    op.create_foreign_key(
        "fk_payments_installment",
        "payments",
        "credit_installments",
        ["installment_id"],
        ["id"],
        ondelete="CASCADE"
    )



def downgrade() -> None:
    """Downgrade schema."""
    pass
