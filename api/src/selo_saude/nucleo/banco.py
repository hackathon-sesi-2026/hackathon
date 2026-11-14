from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from selo_saude.configuracao import configuracao


class Base(DeclarativeBase):
    """Base de todos os modelos. Cada módulo prefixa suas tabelas com o próprio nome."""


motor = create_async_engine(configuracao.url_sqlalchemy, pool_pre_ping=True)
fabrica_de_sessoes = async_sessionmaker(motor, expire_on_commit=False)


async def obter_sessao() -> AsyncIterator[AsyncSession]:
    """Uma sessão por requisição. Quem altera dados efetiva com `tempo_real.efetivar`."""
    async with fabrica_de_sessoes() as sessao:
        yield sessao


Sessao = Annotated[AsyncSession, Depends(obter_sessao)]
