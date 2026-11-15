"""intensidade da dor no pulso

Revisão: 0007
Anterior: 0006
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("pulso_resposta", sa.Column("intensidade_dor", sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("pulso_resposta", "intensidade_dor")
