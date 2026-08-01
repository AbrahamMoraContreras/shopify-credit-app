"""Unify InstallmentStatus: migrate VENCIDO → VENCIDA and drop duplicate enum value.

Revision ID: a1b2c3d4e5f6
Revises: 46303b6ccb36
Create Date: 2026-08-01 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "46303b6ccb36"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New enum without the legacy VENCIDO label (canonical overdue = VENCIDA).
    op.execute(
        """
        CREATE TYPE installmentstatus_new AS ENUM (
            'PENDIENTE',
            'PAGADA',
            'VENCIDA',
            'CANCELADA',
            'NO_PAGADA'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE credit_installments
            ALTER COLUMN status DROP DEFAULT,
            ALTER COLUMN status TYPE installmentstatus_new
            USING (
                CASE status::text
                    WHEN 'VENCIDO' THEN 'VENCIDA'
                    ELSE status::text
                END
            )::installmentstatus_new
        """
    )
    op.execute("DROP TYPE installmentstatus")
    op.execute("ALTER TYPE installmentstatus_new RENAME TO installmentstatus")
    op.execute(
        """
        ALTER TABLE credit_installments
            ALTER COLUMN status SET DEFAULT 'PENDIENTE'::installmentstatus
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE TYPE installmentstatus_old AS ENUM (
            'PENDIENTE',
            'PAGADA',
            'VENCIDA',
            'VENCIDO',
            'CANCELADA',
            'NO_PAGADA'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE credit_installments
            ALTER COLUMN status DROP DEFAULT,
            ALTER COLUMN status TYPE installmentstatus_old
            USING status::text::installmentstatus_old
        """
    )
    op.execute("DROP TYPE installmentstatus")
    op.execute("ALTER TYPE installmentstatus_old RENAME TO installmentstatus")
    op.execute(
        """
        ALTER TABLE credit_installments
            ALTER COLUMN status SET DEFAULT 'PENDIENTE'::installmentstatus
        """
    )
