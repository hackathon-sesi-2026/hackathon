from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Mensagem(Base):
    """Mensagem da conversa com o trabalhador. Regra de privacidade: nenhuma leva informação clínica."""

    __tablename__ = "comunicacao_mensagem"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Desempata mensagens gravadas no mesmo instante, preservando a ordem da conversa.
    sequencia: Mapped[int] = mapped_column(BigInteger, Identity(), unique=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    de: Mapped[str] = mapped_column(String(12))
    texto: Mapped[str] = mapped_column(Text)
    hora: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Botões de resposta. Só a última mensagem do SESI fica clicável.
    acoes: Mapped[list[str] | None] = mapped_column(JSONB)
    passo_id: Mapped[str | None] = mapped_column(String(32))
