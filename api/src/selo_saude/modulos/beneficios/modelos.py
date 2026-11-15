from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from selo_saude.nucleo.banco import Base


class Resgate(Base):
    """Um benefício que a pessoa resgatou com pontos de participação.

    Os pontos ganhos não são guardados: saem sempre dos passos feitos e das semanas de cuidado. Só o gasto é gravado.
    """

    __tablename__ = "beneficios_resgate"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trabalhador_id: Mapped[str] = mapped_column(String(32), index=True)
    beneficio_id: Mapped[str] = mapped_column(String(40))
    codigo: Mapped[str] = mapped_column(String(20))
    pontos: Mapped[int] = mapped_column(SmallInteger)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
