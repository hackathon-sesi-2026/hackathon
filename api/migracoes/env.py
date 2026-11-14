"""Ambiente do Alembic. A URL do banco vem da mesma configuração da API (variável SELO_URL_BANCO)."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from selo_saude.configuracao import configuracao
from selo_saude.demonstracao.semente import TABELAS  # importa os modelos de todos os módulos
from selo_saude.nucleo.banco import Base

assert TABELAS
if context.config.config_file_name:
    fileConfig(context.config.config_file_name)

metadados = Base.metadata


def _migrar(conexao: Connection) -> None:
    context.configure(connection=conexao, target_metadata=metadados)
    with context.begin_transaction():
        context.run_migrations()


async def _migrar_conectado() -> None:
    motor = create_async_engine(configuracao.url_sqlalchemy)
    async with motor.connect() as conexao:
        await conexao.run_sync(_migrar)
    await motor.dispose()


if context.is_offline_mode():
    context.configure(url=configuracao.url_sqlalchemy, target_metadata=metadados, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_migrar_conectado())
