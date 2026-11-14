from datetime import datetime

from sqlalchemy import Boolean, DateTime, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Consulta(Base):
    """O retorno em aberto do trabalhador. Há no máximo um por pessoa."""

    __tablename__ = "agenda_consulta"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), unique=True)
    data: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    local: Mapped[str] = mapped_column(String(80))
    profissional: Mapped[str] = mapped_column(String(80))
    modalidade: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12))
    # Só vale para consulta no turno: a pessoa autorizou a liderança a ver o nome. O motivo, nunca.
    nome_para_lideranca: Mapped[bool] = mapped_column(Boolean, default=False)
    compromisso: Mapped[str | None] = mapped_column(String(80))
    lembretes_automaticos: Mapped[list[str]] = mapped_column(JSONB, default=list)


class Liberacao(Base):
    """Liberação de turno já conhecida de outras fontes. As que nascem aqui vêm de `Consulta`."""

    __tablename__ = "agenda_liberacao"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    unidade: Mapped[str] = mapped_column(String(80), index=True)
    turno: Mapped[str] = mapped_column(String(40))
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duracao_min: Mapped[int] = mapped_column(SmallInteger)
    nome: Mapped[str | None] = mapped_column(String(40))
