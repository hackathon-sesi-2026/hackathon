"""Interface pública dos indicadores: o que a empresa pode ver, sempre agregado.

É aqui que a regra "a empresa nunca vê o indivíduo" vira código: grupos com menos de MINIMO_DO_GRUPO
pessoas são omitidos antes de qualquer dado sair do servidor.
"""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.cadastro.servico import TURNOS, Turno
from selo_saude.modulos.pulso import servico as pulso
from selo_saude.modulos.pulso.servico import DadosPulso
from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, slug

from .modelos import EmDiaPorTurno, ResumoUnidade

MINIMO_DO_GRUPO = 5
META_DO_TURNO = 80
DIAS_DO_PULSO = 28


class MetaDoTurno(Esquema):
    turno: str
    valor: int
    """Percentual do turno em dia com o cuidado."""
    meta: int


class UnidadeComTotem(Esquema):
    slug: str
    unidade: str


class IndicadoresDoPulso(Esquema):
    respostas: int
    energia_baixa: int
    dor_forte: int
    sono_ruim: int


class PulsoDoTurno(Esquema):
    unidade: str
    turno: str
    oculto: bool
    """Grupo pequeno demais para aparecer."""
    indicadores: IndicadoresDoPulso | None
    alertas: list[str]


class SemanaDoPulso(Esquema):
    rotulo: str
    respostas: int


class IndicadoresDaUnidade(Esquema):
    unidade: str
    vidas: int
    funil: dict[str, int]
    comparecimento_antes: int
    comparecimento_agora: int
    planos_recebidos: int
    em_dia_com_risco: int
    motivos: dict[str, int]
    respostas_no_totem: int


class PainelDaEmpresa(Esquema):
    empresa: str
    minimo_do_grupo: int
    filtro: str
    unidades: list[IndicadoresDaUnidade]
    """Unidades visíveis, para o comparativo e para o seletor."""
    unidades_ocultas: list[str]
    vidas: int
    comparecimento_antes: int
    comparecimento_agora: int
    planos_recebidos: int
    pulso: IndicadoresDoPulso
    semanas: list[SemanaDoPulso]
    turnos: list[PulsoDoTurno]


class TurnoDaLideranca(Esquema):
    turno: Turno
    em_dia: int


class UnidadeDaLideranca(Esquema):
    unidade: str
    turnos: list[TurnoDaLideranca]


# ---------------------------------------------------------------- meta coletiva e totem


async def meta_do_turno(sessao: AsyncSession, unidade: str, turno: str) -> MetaDoTurno | None:
    linha = await sessao.get(EmDiaPorTurno, (unidade, turno))
    return MetaDoTurno(turno=turno, valor=linha.percentual, meta=META_DO_TURNO) if linha else None


async def unidades_com_totem(sessao: AsyncSession) -> list[UnidadeComTotem]:
    return [UnidadeComTotem(slug=slug(u.unidade), unidade=u.unidade) for u in await _visiveis(sessao)]


async def unidade_do_totem(sessao: AsyncSession, slug_da_unidade: str) -> str:
    for unidade in await unidades_com_totem(sessao):
        if unidade.slug == slug_da_unidade:
            return unidade.unidade
    raise NaoEncontrado("Unidade não encontrada")


# ---------------------------------------------------------------- liderança


async def unidades_da_lideranca(sessao: AsyncSession) -> list[UnidadeDaLideranca]:
    """Unidades e turnos diurnos, que são os que têm microconsulta e portanto liberação a organizar."""
    turnos = {t.nome: t for t in TURNOS}
    por_unidade: dict[str, list[TurnoDaLideranca]] = {}
    for linha in await sessao.scalars(select(EmDiaPorTurno).order_by(EmDiaPorTurno.unidade, EmDiaPorTurno.turno)):
        turno = turnos.get(linha.turno)
        if turno and not turno.noturno:
            por_unidade.setdefault(linha.unidade, []).append(TurnoDaLideranca(turno=turno, em_dia=linha.percentual))
    return [UnidadeDaLideranca(unidade=u, turnos=t) for u, t in por_unidade.items()]


# ---------------------------------------------------------------- RH e direção


async def painel_da_empresa(sessao: AsyncSession, filtro: str = "todas") -> PainelDaEmpresa:
    """Indicadores da empresa. `filtro` é o nome de uma unidade visível ou "todas"."""
    todas = list(await sessao.scalars(select(ResumoUnidade).order_by(ResumoUnidade.unidade)))
    visiveis = [u for u in todas if u.vidas >= MINIMO_DO_GRUPO]
    selecionadas = visiveis if filtro == "todas" else [u for u in visiveis if u.unidade == filtro]
    if not selecionadas:
        raise NaoEncontrado("Unidade não encontrada")

    hoje = relogio.inicio_do_dia(relogio.agora())
    todas_as_respostas = await pulso.listar_desde(
        sessao, hoje - timedelta(days=DIAS_DO_PULSO), [u.unidade for u in visiveis]
    )
    do_filtro_bruto = [r for r in todas_as_respostas if r.unidade in {u.unidade for u in selecionadas}]
    # Só entram nos totais as respostas de grupos (unidade + turno) com 5 ou mais. Assim nenhum agregado
    # deixa descobrir um turno oculto por diferença, mesmo com uma unidade filtrada.
    respostas = _so_grupos_visiveis(todas_as_respostas)
    do_filtro = _so_grupos_visiveis(do_filtro_bruto)
    vidas = sum(u.vidas for u in selecionadas)

    def media(campo: str) -> int:
        return _arredondar(sum(getattr(u, campo) * u.vidas for u in selecionadas) / max(1, vidas))

    semanas = []
    for k in (3, 2, 1, 0):
        inicio = hoje + timedelta(days=-7 * (k + 1) + 1)
        fim = hoje + timedelta(days=-7 * k + 1)
        semanas.append(
            SemanaDoPulso(
                rotulo=f"{relogio.data_curta(inicio)}–{relogio.data_curta(fim - timedelta(days=1))}",
                respostas=sum(1 for r in do_filtro if inicio <= r.data < fim),
            )
        )

    return PainelDaEmpresa(
        empresa=selecionadas[0].empresa,
        minimo_do_grupo=MINIMO_DO_GRUPO,
        filtro=filtro,
        unidades=[
            IndicadoresDaUnidade(
                unidade=u.unidade,
                vidas=u.vidas,
                funil=u.funil,
                comparecimento_antes=u.comparecimento_antes,
                comparecimento_agora=u.comparecimento_agora,
                planos_recebidos=u.planos_recebidos,
                em_dia_com_risco=u.em_dia_com_risco,
                motivos=_motivos_visiveis(u.motivos),
                respostas_no_totem=sum(1 for r in respostas if r.unidade == u.unidade),
            )
            for u in visiveis
        ],
        unidades_ocultas=[u.unidade for u in todas if u.vidas < MINIMO_DO_GRUPO],
        vidas=vidas,
        comparecimento_antes=media("comparecimento_antes"),
        comparecimento_agora=media("comparecimento_agora"),
        planos_recebidos=media("planos_recebidos"),
        pulso=_indicadores(do_filtro),
        semanas=semanas,
        turnos=_por_turno(do_filtro_bruto),
    )


def _so_grupos_visiveis(respostas: list[DadosPulso]) -> list[DadosPulso]:
    """Descarta as respostas de grupos (unidade + turno) com menos de MINIMO_DO_GRUPO respostas."""
    tamanho: dict[tuple[str, str], int] = {}
    for r in respostas:
        tamanho[(r.unidade, r.turno)] = tamanho.get((r.unidade, r.turno), 0) + 1
    return [r for r in respostas if tamanho[(r.unidade, r.turno)] >= MINIMO_DO_GRUPO]


def _motivos_visiveis(motivos: dict[str, int]) -> dict[str, int]:
    """Contagens de 1 a 4 de um motivo numa unidade podem apontar pessoas: saem do que a empresa vê.
    Zero continua aparecendo (não identifica ninguém)."""
    return {motivo: n for motivo, n in motivos.items() if n == 0 or n >= MINIMO_DO_GRUPO}


def _por_turno(respostas: list[DadosPulso]) -> list[PulsoDoTurno]:
    grupos: dict[tuple[str, str], list[DadosPulso]] = {}
    for resposta in respostas:
        grupos.setdefault((resposta.unidade, resposta.turno), []).append(resposta)
    turnos = []
    for (unidade, turno), grupo in sorted(grupos.items()):
        if len(grupo) < MINIMO_DO_GRUPO:
            turnos.append(PulsoDoTurno(unidade=unidade, turno=turno, oculto=True, indicadores=None, alertas=[]))
            continue
        indicadores = _indicadores(grupo)
        turnos.append(
            PulsoDoTurno(
                unidade=unidade, turno=turno, oculto=False, indicadores=indicadores, alertas=_alertas(indicadores)
            )
        )
    return turnos


def _alertas(i: IndicadoresDoPulso) -> list[str]:
    """Leituras do pulso que sugerem uma ação da empresa sobre as condições de trabalho, não sobre pessoas."""
    alertas = []
    if i.sono_ruim >= 40:
        alertas.append(
            f"{i.sono_ruim}% dizem dormir mal. Vale uma ação sobre sono para quem trabalha à noite e revisar a escala."
        )
    if i.dor_forte >= 25:
        alertas.append(f"{i.dor_forte}% relatam dor forte. Sugere olhar ergonomia do posto e pausas.")
    if i.energia_baixa >= 35:
        alertas.append(f"{i.energia_baixa}% com energia baixa. Hidratação e pausas no turno.")
    return alertas


def _indicadores(respostas: list[DadosPulso]) -> IndicadoresDoPulso:
    total = len(respostas)

    def percentual(condicao) -> int:
        return _arredondar(sum(1 for r in respostas if condicao(r)) / total * 100) if total else 0

    return IndicadoresDoPulso(
        respostas=total,
        energia_baixa=percentual(lambda r: r.energia == 1),
        dor_forte=percentual(lambda r: r.dor == 3),
        sono_ruim=percentual(lambda r: r.sono == 1),
    )


def _arredondar(valor: float) -> int:
    return int(valor + 0.5)


async def _visiveis(sessao: AsyncSession) -> list[ResumoUnidade]:
    unidades = await sessao.scalars(
        select(ResumoUnidade).where(ResumoUnidade.vidas >= MINIMO_DO_GRUPO).order_by(ResumoUnidade.unidade)
    )
    return list(unidades)
