import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from selo_saude.composicao import compor
from selo_saude.configuracao import configuracao
from selo_saude.demonstracao import semente
from selo_saude.nucleo.banco import fabrica_de_sessoes
from selo_saude.nucleo.erros import registrar_tratadores
from selo_saude.nucleo.tempo_real import central
from selo_saude.publicos import demonstracao, painel, totem, trabalhador

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
registro = logging.getLogger(__name__)


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI) -> AsyncIterator[None]:
    if configuracao.modo_demonstracao:
        async with fabrica_de_sessoes() as sessao:
            if await semente.semear_se_vazio(sessao):
                await sessao.commit()
                registro.info("Banco vazio: dados fictícios da demonstração criados")
    escuta = asyncio.create_task(central.executar())
    try:
        yield
    finally:
        escuta.cancel()
        with suppress(asyncio.CancelledError):
            await escuta


def criar_app() -> FastAPI:
    compor()
    app = FastAPI(
        title="Selo Saúde",
        description="Engajamento na APS do SESI. Cada grupo de rotas devolve só o que o seu público pode ver.",
        version="0.1.0",
        lifespan=ciclo_de_vida,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuracao.origens_permitidas,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    registrar_tratadores(app)
    for rota in (trabalhador.rota, totem.rota, painel.aps, painel.lideranca, painel.rh):
        app.include_router(rota)
    if configuracao.modo_demonstracao:
        app.include_router(demonstracao.rota)

    @app.get("/api/saude", tags=["Operação"])
    async def saude() -> dict[str, str]:
        return {"estado": "ok"}

    return app


app = criar_app()
