"""Barramento de eventos de domínio, em processo.

É por aqui que os módulos conversam sem se importar uns aos outros: quem muda um dado publica o que
aconteceu, e os módulos interessados reagem na mesma transação. As assinaturas ficam todas em
`selo_saude.composicao`, e a ordem em que aparecem lá é a ordem de execução.
"""

from collections import defaultdict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True, kw_only=True)
class EventoDominio:
    """Algo que já aconteceu. Carrega só identificadores e o mínimo para os assinantes reagirem."""


Manipulador = Callable[[AsyncSession, Any], Awaitable[None]]

_por_tipo: dict[type[EventoDominio], list[Manipulador]] = defaultdict(list)
_para_todos: list[Manipulador] = []


def assinar(tipo: type[EventoDominio], manipulador: Manipulador) -> None:
    _por_tipo[tipo].append(manipulador)


def assinar_todos(manipulador: Manipulador) -> None:
    _para_todos.append(manipulador)


async def publicar(sessao: AsyncSession, evento: EventoDominio) -> None:
    for manipulador in (*_por_tipo[type(evento)], *_para_todos):
        await manipulador(sessao, evento)
