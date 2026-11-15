"""benefícios resgatados com pontos de participação

Revisão: 0008
Anterior: 0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "beneficios_resgate",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("trabalhador_id", sa.String(length=32), nullable=False),
        sa.Column("beneficio_id", sa.String(length=40), nullable=False),
        sa.Column("codigo", sa.String(length=20), nullable=False),
        sa.Column("pontos", sa.SmallInteger(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_beneficios_resgate_trabalhador_id", "beneficios_resgate", ["trabalhador_id"])


def downgrade() -> None:
    op.drop_index("ix_beneficios_resgate_trabalhador_id", table_name="beneficios_resgate")
    op.drop_table("beneficios_resgate")
