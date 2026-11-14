"""Rotas que só existem para a apresentação. Não são registradas fora do modo de demonstração."""

from fastapi import APIRouter

from selo_saude.demonstracao import semente
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.nucleo.banco import Sessao
from selo_saude.nucleo.tempo_real import avisar, transacional

from . import canais

rota = APIRouter(prefix="/api/demonstracao", tags=["Demonstração"])


@rota.post("/reinicio", status_code=204)
@transacional
async def reiniciar(sessao: Sessao) -> None:
    """Apaga tudo e recria os dados fictícios, com as datas relativas a hoje."""
    await semente.reiniciar(sessao)
    avisar(sessao, canais.APS, canais.LIDERANCA, canais.RH)
    avisar(sessao, *(canais.do_trabalhador(f"t{n + 1}") for n in range(len(semente.PESSOAS))))
    avisar(sessao, *(canais.do_totem(u.unidade) for u in await indicadores.unidades_com_totem(sessao)))
