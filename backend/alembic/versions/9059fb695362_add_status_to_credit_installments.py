"""add status to credit_installments

Revision ID: 9059fb695362
Revises: 0fe78653f810
Create Date: 2025-12-22 23:47:22.143427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9059fb695362'
down_revision: Union[str, Sequence[str], None] = '0fe78653f810'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "credit_installments",
        sa.Column(
            "status",
            sa.Enum(
                "PENDIENTE",
                "PAGADO",
                "VENCIDO",
                name="installmentstatus"
            ),
            nullable=False,
            server_default="PENDIENTE"
        )
    )


def downgrade():
    op.drop_column("credit_installments", "status")