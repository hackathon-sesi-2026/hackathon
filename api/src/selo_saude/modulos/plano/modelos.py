from datetime import datetime

from sqlalchemy import Boolean, DateTime, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class PlanoCuidado(Base):
    """Situação do plano de uma pessoa: se chegou, se foi entendido e há quantas semanas ela se cuida."""

    __tablename__ = "plano_cuidado"

    trabalhador_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(12), default="nao_enviado")
    data_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    teach_back: Mapped[str] = mapped_column(String(10), default="pendente")
    semanas_seguidas: Mapped[int] = mapped_column(SmallInteger, default=0)
    ultima_semana_contada: Mapped[str | None] = mapped_column(String(8))


class Passo(Base):
    """Um item do plano em linguagem simples. O texto técnico original fica em `itens_tecnicos`."""

    __tablename__ = "plano_passo"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    ordem: Mapped[int] = mapped_column(SmallInteger)
    categoria: Mapped[str] = mapped_column(String(12))
    titulo: Mapped[str] = mapped_column(String(120))
    detalhe: Mapped[str] = mapped_column(Text)
    ganho: Mapped[str] = mapped_column(String(160))
    prazo: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    feito: Mapped[bool] = mapped_column(Boolean, default=False)
    itens_tecnicos: Mapped[list[str] | None] = mapped_column(JSONB)


class Dificuldade(Base):
    """O "não consegui" do trabalhador, com o motivo. Nota da enfermagem sem dado clínico."""

    __tablename__ = "plano_dificuldade"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    motivo: Mapped[str] = mapped_column(String(12))
    passo_id: Mapped[str | None] = mapped_column(String(32))
    origem: Mapped[str] = mapped_column(String(12))
    data: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resolvida: Mapped[bool] = mapped_column(Boolean, default=False)
    nota: Mapped[str | None] = mapped_column(Text)
