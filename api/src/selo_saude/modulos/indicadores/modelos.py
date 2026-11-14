from sqlalchemy import Integer, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class ResumoUnidade(Base):
    """Indicadores já agregados de uma unidade. No produto, viriam do painel de BI do programa."""

    __tablename__ = "indicadores_resumo_unidade"

    unidade: Mapped[str] = mapped_column(String(80), primary_key=True)
    empresa: Mapped[str] = mapped_column(String(120))
    vidas: Mapped[int] = mapped_column(Integer)
    # Funil do retorno nos últimos 30 dias: contato, resposta, agendamento, comparecimento.
    funil: Mapped[dict[str, int]] = mapped_column(JSONB)
    comparecimento_antes: Mapped[int] = mapped_column(SmallInteger)
    comparecimento_agora: Mapped[int] = mapped_column(SmallInteger)
    planos_recebidos: Mapped[int] = mapped_column(SmallInteger)
    em_dia_com_risco: Mapped[int] = mapped_column(SmallInteger)
    # Contagem dos motivos do "não consegui".
    motivos: Mapped[dict[str, int]] = mapped_column(JSONB)


class EmDiaPorTurno(Base):
    """Percentual do turno em dia com o cuidado. Alimenta a meta coletiva: reconhece o grupo, nunca a pessoa."""

    __tablename__ = "indicadores_em_dia_turno"

    unidade: Mapped[str] = mapped_column(String(80), primary_key=True)
    turno: Mapped[str] = mapped_column(String(40), primary_key=True)
    percentual: Mapped[int] = mapped_column(SmallInteger)
