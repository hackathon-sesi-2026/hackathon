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
    # Acompanhamento nos últimos 30 dias, na ordem da jornada: respondeu o WhatsApp, realizou exame,
    # realizou consulta, voltou para a reavaliação.
    funil: Mapped[dict[str, int]] = mapped_column(JSONB)
    comparecimento_antes: Mapped[int] = mapped_column(SmallInteger)
    comparecimento_agora: Mapped[int] = mapped_column(SmallInteger)
    planos_recebidos: Mapped[int] = mapped_column(SmallInteger)
    em_dia_com_risco: Mapped[int] = mapped_column(SmallInteger)
    # Consultas por especialidade médica nos últimos 30 dias. No produto, viriam do S+, sempre agregadas.
    especialidades: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
    # Contagem dos motivos do "não consegui".
    motivos: Mapped[dict[str, int]] = mapped_column(JSONB)


class EmDiaPorTurno(Base):
    """Percentual do turno em dia com o cuidado. Sempre agregado: nunca a pessoa."""

    __tablename__ = "indicadores_em_dia_turno"

    unidade: Mapped[str] = mapped_column(String(80), primary_key=True)
    turno: Mapped[str] = mapped_column(String(40), primary_key=True)
    percentual: Mapped[int] = mapped_column(SmallInteger)
