"""Rotas que só existem para a apresentação. Não são registradas fora do modo de demonstração."""

from fastapi import APIRouter, BackgroundTasks

from selo_saude.demonstracao import semente
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.monitoramento import servico as monitoramento
from selo_saude.nucleo.banco import Sessao, fabrica_de_sessoes
from selo_saude.nucleo.tempo_real import TUDO, avisar, transacional

from . import canais

rota = APIRouter(prefix="/api/demonstracao", tags=["Demonstração"])


async def _aquecer_carteira() -> None:
    async with fabrica_de_sessoes() as sessao:
        await monitoramento.aquecer(sessao)


@rota.post("/reinicio", status_code=204)
@transacional
async def reiniciar(sessao: Sessao, depois: BackgroundTasks) -> None:
    """Apaga tudo e recria os dados fictícios, com as datas relativas a hoje. Depois de responder, já calcula
    a carteira da APS de novo, para o painel não esperar."""
    depois.add_task(_aquecer_carteira)
    await semente.reiniciar(sessao)
    avisar(sessao, TUDO, canais.APS, canais.LIDERANCA, canais.RH)
    avisar(sessao, *(canais.do_trabalhador(f"t{n + 1}") for n in range(len(semente.PESSOAS))))
    avisar(sessao, *(canais.do_totem(u.unidade) for u in await indicadores.unidades_com_totem(sessao)))
