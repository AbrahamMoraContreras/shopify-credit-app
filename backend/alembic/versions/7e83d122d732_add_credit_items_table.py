"""add credit_items table

Revision ID: 7e83d122d732
Revises: 9059fb695362
Create Date: 2025-12-25 23:38:35.422618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e83d122d732'
down_revision: Union[str, Sequence[str], None] = '9059fb695362'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None




def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
    'credit_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('credit_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.String(), nullable=False),
    sa.Column('product_code', sa.String(), nullable=False),
    sa.Column('product_name', sa.String(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(12,2), nullable=False),
    sa.Column('total_price', sa.Numeric(12,2), nullable=False),
    sa.ForeignKeyConstraint(['credit_id'], ['credits.id']),
    sa.PrimaryKeyConstraint('id')
)


def downgrade() -> None:
    """Downgrade schema."""
    pass
