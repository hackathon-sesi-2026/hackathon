"""Interface pública do pulso: as respostas anônimas do totem."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo import relogio
from selo_saude.nucleo.esquema import Esquema, novo_id
from selo_saude.nucleo.eventos import EventoDominio, publicar

from .modelos import Pulso
from .regras import BemEstar, IntensidadeDor, LocalDor, local_guardado

Nivel = Literal[1, 2, 3]


@dataclass(frozen=True, kw_only=True)
class PulsoRegistrado(EventoDominio):
    unidade: str


class DadosPulso(Esquema):
    unidade: str
    turno: str
    data: datetime
    bem_estar: int | None = None
    intensidade_dor: int | None = None
    local_dor: str | None = None
    # Formato antigo: respostas gravadas antes do pulso de 4 níveis.
    energia: Nivel | None = None
    dor: Nivel | None = None
    sono: Nivel | None = None


def turno_agora(instante: datetime | None = None) -> str:
    """Turno em andamento, para o totem não precisar perguntar."""
    hora = relogio.local(instante or relogio.agora()).hour
    if 6 <= hora < 14:
        return "Turno A"
    if 14 <= hora < 22:
        return "Turno B"
    return "Turno C (noite)"


async def registrar(
    sessao: AsyncSession,
    unidade: str,
    bem_estar: BemEstar,
    local_dor: LocalDor | None = None,
    intensidade_dor: IntensidadeDor | None = None,
) -> None:
    """Grava a resposta sem nada que identifique quem respondeu, nem o CPF que a pessoa digitou no totem."""
    sessao.add(
        Pulso(
            id=novo_id(),
            unidade=unidade,
            turno=turno_agora(),
            data=relogio.agora(),
            bem_estar=bem_estar,
            intensidade_dor=intensidade_dor,
            local_dor=local_guardado(intensidade_dor, local_dor),
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


# ---------------------------------------------------------------- métricas dos totens (equipe de saúde)

MINIMO_DO_GRUPO = 5


class RespostasDoDia(Esquema):
    dia: str
    """AAAA-MM-DD, no fuso da unidade."""
    respostas: int


class TurnoNoTotem(Esquema):
    unidade: str
    turno: str
    respostas: int
    oculto: bool
    """Menos de 5 respostas: os percentuais não aparecem, para ninguém ser reconhecido."""
    cansados: int | None
    com_dor: int | None
    """Percentuais."""


class MetricasDoTotem(Esquema):
    """Como os totens estão sendo usados e o que as respostas dizem. Tudo agregado e anônimo."""

    unidades: list[str]
    respostas: int
    respostas_hoje: int
    por_dia: list[RespostasDoDia]
    por_hora: list[int]
    """24 posições: respostas por hora do dia, das 0h às 23h."""
    bem_estar: dict[str, int]
    """"1" cansado(a), "2" mais ou menos, "3" bem, "4" muito bem."""
    intensidade: dict[str, int]
    """"0" nenhuma, "1" leve, "2" média, "3" forte."""
    locais_de_dor: dict[str, int]
    por_turno: list[TurnoNoTotem]


async def metricas(sessao: AsyncSession, unidade: str | None = None, dias: int = 28) -> MetricasDoTotem:
    agora = relogio.agora()
    desde = relogio.inicio_do_dia(agora) - timedelta(days=dias - 1)
    todas = sorted(set(await sessao.scalars(select(Pulso.unidade).distinct())))
    consulta = select(Pulso.unidade, Pulso.turno, Pulso.data, Pulso.bem_estar, Pulso.intensidade_dor, Pulso.local_dor)
    consulta = consulta.where(Pulso.data >= desde)
    if unidade:
        consulta = consulta.where(Pulso.unidade == unidade)
    linhas = (await sessao.execute(consulta)).all()

    hoje = relogio.local(agora).date()
    por_dia = {(hoje - timedelta(days=d)).isoformat(): 0 for d in range(dias - 1, -1, -1)}
    por_hora = [0] * 24
    bem: dict[str, int] = dict.fromkeys(("1", "2", "3", "4"), 0)
    intensidade: dict[str, int] = dict.fromkeys(("0", "1", "2", "3"), 0)
    locais: dict[str, int] = defaultdict(int)
    turnos: dict[tuple[str, str], list] = defaultdict(list)
    respostas_hoje = 0
    for u, turno, data, bem_estar, dor, local in linhas:
        local_da_data = relogio.local(data)
        chave = local_da_data.date().isoformat()
        if chave in por_dia:
            por_dia[chave] += 1
        respostas_hoje += local_da_data.date() == hoje
        por_hora[local_da_data.hour] += 1
        if bem_estar:
            bem[str(bem_estar)] += 1
        if dor is not None:
            intensidade[str(dor)] += 1
        if local:
            locais[local] += 1
        turnos[(u, turno)].append((bem_estar, local))

    def pct(parte: int, total: int) -> int:
        return round(parte * 100 / total) if total else 0

    por_turno = []
    for (u, turno), respostas in sorted(turnos.items()):
        oculto = len(respostas) < MINIMO_DO_GRUPO
        por_turno.append(
            TurnoNoTotem(
                unidade=u,
                turno=turno,
                respostas=len(respostas),
                oculto=oculto,
                cansados=None if oculto else pct(sum(b == 1 for b, _ in respostas), len(respostas)),
                com_dor=None if oculto else pct(sum(loc is not None for _, loc in respostas), len(respostas)),
            )
        )
    return MetricasDoTotem(
        unidades=todas,
        respostas=len(linhas),
        respostas_hoje=respostas_hoje,
        por_dia=[RespostasDoDia(dia=d, respostas=n) for d, n in por_dia.items()],
        por_hora=por_hora,
        bem_estar=bem,
        intensidade=intensidade,
        locais_de_dor={k: v for k, v in locais.items() if v >= MINIMO_DO_GRUPO},
        por_turno=por_turno,
    )


async def listar_desde(sessao: AsyncSession, desde: datetime, unidades: list[str]) -> list[DadosPulso]:
    respostas = await sessao.scalars(select(Pulso).where(Pulso.data >= desde, Pulso.unidade.in_(unidades)))
    return [DadosPulso.model_validate(r) for r in respostas]
