"""xxxx_soft_2

Revision ID: 14b360727865
Revises: e311cf4e0815
Create Date: 2026-01-11 14:06:50.280648

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '14b360727865'
down_revision: Union[str, Sequence[str], None] = 'e311cf4e0815'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # credits
    op.drop_column("credits", "customer_name")
    op.drop_column("credits", "customer_document_id")
    op.drop_column("credits", "customer_extra")

    op.alter_column("credits", "balance",
        type_=sa.Numeric(14,4))

    # credit_installments
    op.alter_column("credit_installments", "paid_amount",
        type_=sa.Numeric(14,4))

    # credit_items
    op.alter_column("credit_items", "unit_price",
        type_=sa.Numeric(14,4))
    op.alter_column("credit_items", "total_price",
        type_=sa.Numeric(14,4))

    # payments
    op.alter_column("payments", "merchant_id", nullable=False)

    # deleted_at (ejemplo para credits)
    for table in [
        "credits",
        "credit_installments",
        "credit_items",
        "payments",
    ]:
        op.add_column(table, sa.Column("deleted_at", sa.DateTime()))

    op.create_table(
        "products",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("unit_price", sa.Numeric(14,4), nullable=False),
        sa.Column("merchant_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.ForeignKeyConstraint(["merchant_id"], ["merchants.id"]),
    )

    op.create_index("ix_products_merchant_id", "products", ["merchant_id"])
