from datetime import date, datetime

from sqlalchemy import Date, DateTime, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Trabalhador(Base):
    """Espelho do cadastro do S+: só identificação, turno, risco e datas. Nada clínico."""

    __tablename__ = "cadastro_trabalhador"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Segredo do link pessoal enviado pelo WhatsApp. É a única credencial do trabalhador.
    token_acesso: Mapped[str] = mapped_column(String(64), unique=True)
    matricula: Mapped[str] = mapped_column(String(20), unique=True)
    # Só os 11 dígitos. É como a pessoa se identifica no totem.
    cpf: Mapped[str | None] = mapped_column(String(11), unique=True)
    nome: Mapped[str] = mapped_column(String(120))
    funcao: Mapped[str] = mapped_column(String(80))
    data_nascimento: Mapped[date] = mapped_column(Date)
    empresa: Mapped[str] = mapped_column(String(120))
    unidade: Mapped[str] = mapped_column(String(80), index=True)
    medico_referencia: Mapped[str] = mapped_column(String(80))
    enfermeira: Mapped[str] = mapped_column(String(40))
    motivacao: Mapped[str | None] = mapped_column(String(20))
    turno_nome: Mapped[str] = mapped_column(String(40))
    turno_inicio: Mapped[int] = mapped_column(SmallInteger)
    turno_fim: Mapped[int] = mapped_column(SmallInteger)
    risco: Mapped[int] = mapped_column(SmallInteger)
    ultima_consulta_medica: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    faltas_ultimo_ano: Mapped[int] = mapped_column(SmallInteger, default=0)
