from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Exame(Base):
    """Pedido de exames e o seu andamento: pedido, coletado, resultado.

    `itens` guarda o resultado já explicado em linguagem simples. É o único dado clínico fora do S+,
    e só sai pela rota do próprio trabalhador. No produto, viria do S+ sob demanda, sem cópia aqui.
    """

    __tablename__ = "exames_exame"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    titulo: Mapped[str] = mapped_column(String(80))
    pedido_por: Mapped[str] = mapped_column(String(80))
    data_pedido: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_coleta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    data_resultado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="pedido")
    # Passo do plano ligado a este exame: marcar o passo como feito registra a coleta.
    passo_id: Mapped[str | None] = mapped_column(String(32))
    # Falso enquanto há resultado novo que a pessoa ainda não abriu.
    resultado_visto: Mapped[bool] = mapped_column(Boolean, default=True)
    itens: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
