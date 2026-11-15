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


TUDO = "*"
"""Destino que diz "mudou tudo" (reinício dos dados, aviso perdido): quem guarda derivados recalcula do zero."""

# Registro das mudanças vistas por esta instância: (versão, destino). Serve para cálculos derivados saberem
# o que ficou velho. Cada gravação efetivada aqui e cada aviso do Postgres (gravação em qualquer instância) entram.
_mudancas: list[tuple[int, str]] = []
_versao_dos_dados = 0
_GUARDAR_MUDANCAS = 5000


def versao_dos_dados() -> int:
    return _versao_dos_dados


def mudancas_desde(versao: int) -> set[str] | None:
    """Destinos avisados depois de `versao`. None quando o registro não alcança tão longe (recalcule tudo)."""
    if versao == _versao_dos_dados:
        return set()
    if not _mudancas or _mudancas[0][0] > versao + 1:
        return None
    return {destino for v, destino in _mudancas if v > versao}


def _dados_mudaram(*destinos: str) -> None:
    global _versao_dos_dados
    _versao_dos_dados += 1
    _mudancas.extend((_versao_dos_dados, d) for d in (destinos or (TUDO,)))
    del _mudancas[: max(0, len(_mudancas) - _GUARDAR_MUDANCAS)]


def avisar(sessao: AsyncSession, *canais: str) -> None:
    """Marca canais para avisar quando a transação desta sessão for efetivada."""
    sessao.info.setdefault("canais", set()).update(canais)


async def efetivar(sessao: AsyncSession) -> None:
    canais = sessao.info.pop("canais", set())
    for canal in canais:
        await sessao.execute(text("select pg_notify(:canal, :destino)"), {"canal": CANAL_POSTGRES, "destino": canal})
    await sessao.commit()
    _dados_mudaram(*canais)


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
        _dados_mudaram(destino)
        for fila in self._filas.get(destino, ()):
            _acordar(fila)

    def _acordar_todos(self) -> None:
        _dados_mudaram()
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
