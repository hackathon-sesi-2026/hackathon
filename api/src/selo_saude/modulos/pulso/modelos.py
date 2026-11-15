from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Pulso(Base):
    """Resposta anônima do totem a "como você está hoje?".

    Não há coluna que ligue a resposta a uma pessoa: o anonimato é da estrutura, não de uma regra de tela.
    """

    __tablename__ = "pulso_resposta"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    unidade: Mapped[str] = mapped_column(String(80), index=True)
    turno: Mapped[str] = mapped_column(String(40))
    data: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    energia: Mapped[int] = mapped_column(SmallInteger)  # 1 baixa, 3 boa
    dor: Mapped[int] = mapped_column(SmallInteger)  # 1 sem dor, 3 dor forte
    sono: Mapped[int] = mapped_column(SmallInteger)  # 1 dormiu mal, 3 dormiu bem
    # Onde dói mais, só quando há dor (leve ou forte). Região do corpo, nunca o sexo do boneco usado na tela.
    local_dor: Mapped[str | None] = mapped_column(String(20))
