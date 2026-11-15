"""Interface pública do pulso: as respostas anônimas do totem."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo import relogio
from selo_saude.nucleo.esquema import Esquema, novo_id
from selo_saude.nucleo.eventos import EventoDominio, publicar

from .modelos import Pulso
from .regras import LocalDor, local_guardado

Nivel = Literal[1, 2, 3]


@dataclass(frozen=True, kw_only=True)
class PulsoRegistrado(EventoDominio):
    unidade: str


class DadosPulso(Esquema):
    unidade: str
    turno: str
    data: datetime
    energia: Nivel
    dor: Nivel
    sono: Nivel
    local_dor: str | None = None


def turno_agora(instante: datetime | None = None) -> str:
    """Turno em andamento, para o totem não precisar perguntar."""
    hora = relogio.local(instante or relogio.agora()).hour
    if 6 <= hora < 14:
        return "Turno A"
    if 14 <= hora < 22:
        return "Turno B"
    return "Turno C (noite)"


async def registrar(
    sessao: AsyncSession, unidade: str, energia: Nivel, dor: Nivel, sono: Nivel, local_dor: LocalDor | None = None
) -> None:
    sessao.add(
        Pulso(
            id=novo_id(),
            unidade=unidade,
            turno=turno_agora(),
            data=relogio.agora(),
            energia=energia,
            dor=dor,
            sono=sono,
            local_dor=local_guardado(dor, local_dor),
        )
    )
    await publicar(sessao, PulsoRegistrado(unidade=unidade))


async def respostas_de_hoje(sessao: AsyncSession, unidade: str, turno: str) -> int:
    hoje = relogio.inicio_do_dia(relogio.agora())
    total = await sessao.scalar(
        select(func.count())
        .select_from(Pulso)
        .where(Pulso.unidade == unidade, Pulso.turno == turno, Pulso.data >= hoje)
    )
    return total or 0


async def listar_desde(sessao: AsyncSession, desde: datetime, unidades: list[str]) -> list[DadosPulso]:
    respostas = await sessao.scalars(select(Pulso).where(Pulso.data >= desde, Pulso.unidade.in_(unidades)))
    return [DadosPulso.model_validate(r) for r in respostas]
