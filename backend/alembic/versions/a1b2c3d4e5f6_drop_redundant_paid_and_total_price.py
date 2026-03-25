"""Drop redundant columns: paid (credit_installments) and total_price (credit_items)

Revision ID: a1b2c3d4e5f6
Revises: 7648f456739f
Create Date: 2026-03-13 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7648f456739f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Elimina columnas redundantes:
    - credit_installments.paid   → ahora derivado de status == 'PAGADA' (@property)
    - credit_items.total_price   → ahora derivado de unit_price * quantity   (@property)
    """
    op.drop_column('credit_installments', 'paid')
    op.drop_column('credit_items', 'total_price')


def downgrade() -> None:
    """Restaura las columnas eliminadas (con valores por defecto seguros)."""
    # Restaurar total_price en credit_items
    op.add_column(
        'credit_items',
        sa.Column('total_price', sa.Numeric(precision=12, scale=2), nullable=True)
    )
    # Rellena los datos desde la fórmula original
    op.execute(
        "UPDATE credit_items SET total_price = unit_price * quantity"
    )
    # Ahora haz NOT NULL (datos ya rellenados)
    op.alter_column('credit_items', 'total_price', nullable=False)

    # Restaurar paid en credit_installments
    op.add_column(
        'credit_installments',
        sa.Column('paid', sa.Boolean(), nullable=True, server_default=sa.text('false'))
    )
    # Rellena desde el status
    op.execute(
        "UPDATE credit_installments SET paid = (status = 'PAGADA')"
    )
    op.alter_column('credit_installments', 'paid', nullable=False)
