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
    # "Como você está hoje?": 1 cansado(a), 2 mais ou menos, 3 bem, 4 muito bem.
    bem_estar: Mapped[int | None] = mapped_column(SmallInteger)
    # Onde dói mais, tocado no boneco. Vazio quando a pessoa não sente dor. Só a região do corpo.
    local_dor: Mapped[str | None] = mapped_column(String(20))
    # Formato antigo do pulso (energia, dor e sono, de 1 a 3). Fica para as respostas já gravadas.
    energia: Mapped[int | None] = mapped_column(SmallInteger)
    dor: Mapped[int | None] = mapped_column(SmallInteger)
    sono: Mapped[int | None] = mapped_column(SmallInteger)
