from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Identity, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Acompanhamento(Base):
    """Estado do acompanhamento de enfermagem de uma pessoa, como na ficha Gestão de Retorno."""

    __tablename__ = "monitoramento_acompanhamento"

    trabalhador_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    ultimo_contato_enfermagem: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    proximo_monitoramento: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pediu_contato: Mapped[bool] = mapped_column(Boolean, default=False)


class Registro(Base):
    """Linha do tempo do cuidado: o que aconteceu e quando. Só participação, nada clínico."""

    __tablename__ = "monitoramento_registro"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    sequencia: Mapped[int] = mapped_column(BigInteger, Identity(), unique=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    tipo: Mapped[str] = mapped_column(String(24))
    data: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    nota: Mapped[str | None] = mapped_column(Text)
