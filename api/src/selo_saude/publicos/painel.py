"""Rotas dos três painéis: APS, liderança do turno e RH e direção.

Cada público tem o seu prefixo e recebe só o que pode ver. A liderança nunca recebe o motivo de uma
liberação, e o RH só recebe agregados já calculados. O corte é feito aqui, no servidor.
"""

from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.servico import DadosLiberacao
from selo_saude.modulos.comunicacao import servico as comunicacao
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.indicadores.servico import META_DO_TURNO, PainelDaEmpresa, UnidadeDaLideranca
from selo_saude.modulos.monitoramento import servico as monitoramento
from selo_saude.modulos.monitoramento.servico import Desfecho, LinhaDaFila
from selo_saude.modulos.plano import servico as plano
from selo_saude.nucleo.banco import Sessao
from selo_saude.nucleo.esquema import Esquema
from selo_saude.nucleo.tempo_real import resposta_sse, transacional

from . import canais

aps = APIRouter(prefix="/api/aps", tags=["Painel da APS"])
lideranca = APIRouter(prefix="/api/lideranca", tags=["Liderança do turno"])
rh = APIRouter(prefix="/api/rh", tags=["RH e Direção"])


# ---------------------------------------------------------------- APS


class LembreteAutomatico(Esquema):
    qual: Literal["D-3", "D-1"]


class Resolucao(Esquema):
    nota: str = ""


@aps.get("/fila")
async def fila(sessao: Sessao) -> list[LinhaDaFila]:
    return await monitoramento.fila(sessao)


@aps.get("/eventos")
async def eventos_da_aps() -> StreamingResponse:
    return resposta_sse(canais.APS)


@aps.post("/trabalhadores/{trabalhador_id}/lembrete", status_code=204)
@transacional
async def enviar_lembrete(trabalhador_id: str, sessao: Sessao) -> None:
    await comunicacao.enviar_lembrete(sessao, trabalhador_id)


@aps.post("/trabalhadores/{trabalhador_id}/lembretes-automaticos", status_code=204)
@transacional
async def disparar_lembrete_automatico(trabalhador_id: str, corpo: LembreteAutomatico, sessao: Sessao) -> None:
    """Na demonstração a enfermeira dispara à mão. No produto, um agendador faz isso em D-3 e D-1."""
    await comunicacao.enviar_lembrete_automatico(sessao, trabalhador_id, corpo.qual)


@aps.post("/trabalhadores/{trabalhador_id}/plano/envio", status_code=204)
@transacional
async def enviar_plano(trabalhador_id: str, sessao: Sessao) -> None:
    await plano.enviar(sessao, trabalhador_id)


@aps.post("/trabalhadores/{trabalhador_id}/checkin-habito", status_code=204)
@transacional
async def enviar_checkin_habito(trabalhador_id: str, sessao: Sessao) -> None:
    await comunicacao.enviar_checkin_habito(sessao, trabalhador_id)


@aps.post("/trabalhadores/{trabalhador_id}/dificuldades/{dificuldade_id}/resolucao", status_code=204)
@transacional
async def resolver_dificuldade(trabalhador_id: str, dificuldade_id: str, corpo: Resolucao, sessao: Sessao) -> None:
    await plano.resolver_dificuldade(sessao, trabalhador_id, dificuldade_id, corpo.nota)


@aps.post("/trabalhadores/{trabalhador_id}/monitoramentos", status_code=204)
@transacional
async def registrar_monitoramento(trabalhador_id: str, corpo: Desfecho, sessao: Sessao) -> None:
    await monitoramento.registrar(sessao, trabalhador_id, corpo)


# ---------------------------------------------------------------- Liderança do turno


class AgendaDoTurno(Esquema):
    meta: int
    unidades: list[UnidadeDaLideranca]
    liberacoes: list[DadosLiberacao]


@lideranca.get("/agenda")
async def agenda_do_turno(sessao: Sessao) -> AgendaDoTurno:
    return AgendaDoTurno(
        meta=META_DO_TURNO,
        unidades=await indicadores.unidades_da_lideranca(sessao),
        liberacoes=await agenda.listar_liberacoes(sessao),
    )


@lideranca.get("/eventos")
async def eventos_da_lideranca() -> StreamingResponse:
    return resposta_sse(canais.LIDERANCA)


# ---------------------------------------------------------------- RH e Direção


@rh.get("/painel")
async def painel_da_empresa(sessao: Sessao, unidade: str = "todas") -> PainelDaEmpresa:
    return await indicadores.painel_da_empresa(sessao, unidade)


@rh.get("/eventos")
async def eventos_do_rh() -> StreamingResponse:
    return resposta_sse(canais.RH)
