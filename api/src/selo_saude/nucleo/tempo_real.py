"""Tempo real por SSE, pronto para várias instâncias da API.

O aviso sai pelo NOTIFY do Postgres dentro da transação, então só é entregue se ela for efetivada, e
chega a todas as instâncias que estão em LISTEN. Cada instância repassa aos seus clientes SSE.

O evento não carrega dado nenhum, só o nome do canal: o cliente busca de novo pela rota do seu público.
Assim a regra de quem pode ver o quê fica num lugar só.
"""

import asyncio
import functools
import logging
from collections import defaultdict
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

import asyncpg
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.configuracao import configuracao

CANAL_POSTGRES = "selo_saude"
INTERVALO_DE_PULSO = 20  # segundos entre comentários que mantêm a conexão SSE aberta
registro = logging.getLogger(__name__)


def avisar(sessao: AsyncSession, *canais: str) -> None:
    """Marca canais para avisar quando a transação desta sessão for efetivada."""
    sessao.info.setdefault("canais", set()).update(canais)


async def efetivar(sessao: AsyncSession) -> None:
    for canal in sessao.info.pop("canais", ()):
        await sessao.execute(text("select pg_notify(:canal, :destino)"), {"canal": CANAL_POSTGRES, "destino": canal})
    await sessao.commit()


def transacional[**P, R](rota: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
    """Efetiva a transação (e os avisos) antes de a rota responder. A rota precisa receber `sessao`."""

    @functools.wraps(rota)
    async def envolta(*args: P.args, **kwargs: P.kwargs) -> R:
        resultado = await rota(*args, **kwargs)
        await efetivar(kwargs["sessao"])  # type: ignore[arg-type]
        return resultado

    return envolta


class Central:
    """Mantém um LISTEN no Postgres e distribui os avisos aos clientes SSE desta instância."""

    def __init__(self) -> None:
        self._filas: dict[str, set[asyncio.Queue[None]]] = defaultdict(set)

    async def executar(self) -> None:
        """Roda enquanto a API estiver de pé. Se a conexão cair, reconecta sozinha."""
        while True:
            conexao = None
            try:
                conexao = await asyncpg.connect(configuracao.url_escuta)
                await conexao.add_listener(CANAL_POSTGRES, self._entregar)
                registro.info("Tempo real: escutando o canal %s", CANAL_POSTGRES)
                self._acordar_todos()  # avisos podem ter se perdido enquanto a conexão esteve fora
                while not conexao.is_closed():
                    await asyncio.sleep(5)
            except asyncio.CancelledError:
                raise
            except Exception:
                registro.exception("Tempo real: conexão de escuta falhou; nova tentativa em 2 s")
            finally:
                if conexao is not None and not conexao.is_closed():
                    await conexao.close()
            await asyncio.sleep(2)

    def _entregar(self, _conexao: Any, _pid: int, _canal: str, destino: str) -> None:
        for fila in self._filas.get(destino, ()):
            _acordar(fila)

    def _acordar_todos(self) -> None:
        for filas in self._filas.values():
            for fila in filas:
                _acordar(fila)

    async def fluxo(self, canal: str) -> AsyncIterator[str]:
        fila: asyncio.Queue[None] = asyncio.Queue(maxsize=1)
        self._filas[canal].add(fila)
        try:
            yield "retry: 2000\n\n"
            while True:
                try:
                    await asyncio.wait_for(fila.get(), INTERVALO_DE_PULSO)
                    yield "event: mudou\ndata: {}\n\n"
                except TimeoutError:
                    yield ": pulso\n\n"
        finally:
            self._filas[canal].discard(fila)
            if not self._filas[canal]:
                del self._filas[canal]


def _acordar(fila: asyncio.Queue[None]) -> None:
    # Fila de tamanho 1: vários avisos seguidos viram uma única nova busca do cliente.
    if not fila.full():
        fila.put_nowait(None)


central = Central()


def resposta_sse(canal: str) -> StreamingResponse:
    return StreamingResponse(
        central.fluxo(canal),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
