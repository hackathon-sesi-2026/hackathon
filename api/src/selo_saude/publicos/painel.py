"""Rotas dos três painéis: APS, liderança do turno e RH e direção.

Cada público tem o seu prefixo e recebe só o que pode ver. A liderança nunca recebe o motivo de uma
liberação, e o RH só recebe agregados já calculados. O corte é feito aqui, no servidor.
"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.servico import DadosLiberacao
from selo_saude.modulos.comunicacao import servico as comunicacao
from selo_saude.modulos.exames import servico as exames
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.indicadores.servico import PainelDaEmpresa, UnidadeDaLideranca
from selo_saude.modulos.monitoramento import servico as monitoramento
from selo_saude.modulos.monitoramento.servico import (
    Desfecho,
    EnvioDaCadencia,
    FiltrosDaFila,
    LinhaDaFila,
    Ordem,
    PaginaDaFila,
    PipelineDaFila,
    ResumoDaFila,
)
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
    """A carteira inteira, sem filtro. A tela usa /lista, /pipeline e /resumo, que filtram no servidor."""
    return await monitoramento.fila(sessao)


def _filtros(
    busca: str = "",
    situacao: str = "",
    precisa_acao: bool | None = Query(None, alias="precisaAcao"),
    risco_falta: str = Query("", alias="riscoFalta"),
    risco: str = "",
    empresa: str | None = None,
    enfermeira: str | None = None,
) -> FiltrosDaFila:
    """Filtros da carteira, pela URL. Listas separadas por vírgula: ?situacao=faltou,remarcar&risco=3,4."""

    def lista(texto: str) -> list[str]:
        return [x for x in texto.split(",") if x]

    return FiltrosDaFila.model_validate(
        {
            "busca": busca,
            "situacoes": lista(situacao),
            "precisa_acao": precisa_acao,
            "risco_falta": lista(risco_falta),
            "risco": [int(x) for x in lista(risco)],
            "empresa": empresa or None,
            "enfermeira": enfermeira or None,
        }
    )


Filtros = Annotated[FiltrosDaFila, Depends(_filtros)]


@aps.get("/lista")
async def lista_da_carteira(
    sessao: Sessao,
    filtros: Filtros,
    ordem: Ordem = "prioridade",
    pagina: int = 1,
    por_pagina: int = Query(50, alias="porPagina", le=200),
) -> PaginaDaFila:
    return await monitoramento.pagina(sessao, filtros, ordem, pagina, por_pagina)


@aps.get("/pipeline")
async def pipeline_da_carteira(
    sessao: Sessao, filtros: Filtros, ordem: Ordem = "prioridade", por_coluna: int = Query(12, alias="porColuna", le=50)
) -> PipelineDaFila:
    return await monitoramento.pipeline(sessao, filtros, ordem, por_coluna)


@aps.get("/trabalhadores/{trabalhador_id}")
async def ficha_da_pessoa(trabalhador_id: str, sessao: Sessao) -> LinhaDaFila:
    """A pessoa completa (histórico, plano, exames), para a ficha aberta. A lista e o pipeline trazem só o resumo."""
    return await monitoramento.ficha(sessao, trabalhador_id)


@aps.get("/resumo")
async def resumo_da_carteira(sessao: Sessao, filtros: Filtros) -> ResumoDaFila:
    return await monitoramento.resumo(sessao, filtros)


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


@aps.post("/trabalhadores/{trabalhador_id}/checkin", status_code=204)
@transacional
async def enviar_checkin(trabalhador_id: str, sessao: Sessao) -> None:
    """Pergunta "como você está desde o último atendimento?". A resposta volta para a fila da enfermagem."""
    await comunicacao.enviar_checkin(sessao, trabalhador_id)


async def _lembrete_d1(sessao: Sessao, trabalhador_id: str) -> None:
    await comunicacao.enviar_lembrete_automatico(sessao, trabalhador_id, "D-1")


async def _lembrete_d3(sessao: Sessao, trabalhador_id: str) -> None:
    await comunicacao.enviar_lembrete_automatico(sessao, trabalhador_id, "D-3")


_ENVIAR = {
    "lembrete_d1": _lembrete_d1,
    "lembrete_d3": _lembrete_d3,
    "convite_retorno": comunicacao.enviar_lembrete,
    "como_voce_esta": comunicacao.enviar_checkin,
    "pergunta_da_semana": comunicacao.enviar_checkin_habito,
}


@aps.post("/cadencia")
@transacional
async def rodar_cadencia_de_hoje(sessao: Sessao) -> list[EnvioDaCadencia]:
    """Roda o agendador uma vez: decide, pessoa por pessoa, a mensagem de hoje e envia.

    No produto, uma tarefa periódica chama isto todo dia, com trava no Postgres para uma instância só.
    Na demonstração, a enfermeira aperta o botão para ver a cadência acontecer.
    """
    envios = await monitoramento.cadencia_do_dia(sessao)
    for envio in envios:
        await _ENVIAR[envio.mensagem](sessao, envio.trabalhador_id)
    return envios


@aps.post("/trabalhadores/{trabalhador_id}/dificuldades/{dificuldade_id}/resolucao", status_code=204)
@transacional
async def resolver_dificuldade(trabalhador_id: str, dificuldade_id: str, corpo: Resolucao, sessao: Sessao) -> None:
    await plano.resolver_dificuldade(sessao, trabalhador_id, dificuldade_id, corpo.nota)


@aps.post("/trabalhadores/{trabalhador_id}/exames/{exame_id}/resultado", status_code=204)
@transacional
async def liberar_resultado(trabalhador_id: str, exame_id: str, sessao: Sessao) -> None:
    """Na demonstração a enfermeira simula. No produto, o resultado chega do laboratório pelo S+."""
    await exames.liberar_resultado(sessao, trabalhador_id, exame_id)


@aps.post("/trabalhadores/{trabalhador_id}/monitoramentos", status_code=204)
@transacional
async def registrar_monitoramento(trabalhador_id: str, corpo: Desfecho, sessao: Sessao) -> None:
    await monitoramento.registrar(sessao, trabalhador_id, corpo)


# ---------------------------------------------------------------- Liderança do turno


class AgendaDoTurno(Esquema):
    unidades: list[UnidadeDaLideranca]
    liberacoes: list[DadosLiberacao]


@lideranca.get("/agenda")
async def agenda_do_turno(sessao: Sessao) -> AgendaDoTurno:
    return AgendaDoTurno(
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
