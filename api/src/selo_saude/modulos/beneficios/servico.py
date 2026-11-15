"""Interface pública dos benefícios: o saldo de pontos, o catálogo e o resgate."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado, RegraViolada
from selo_saude.nucleo.esquema import Esquema, novo_id

from .modelos import Resgate
from .regras import (
    CATALOGO,
    PONTOS_POR_PASSO,
    PONTOS_POR_SEMANA,
    beneficio,
    codigo_do_resgate,
    pode_resgatar,
    pontos_ganhos,
    saldo,
)


class ItemDoCatalogo(Esquema):
    id: str
    titulo: str
    descricao: str
    pontos: int
    icone: str
    pode_resgatar: bool


class MeuResgate(Esquema):
    id: str
    beneficio_id: str
    titulo: str
    codigo: str
    pontos: int
    criado_em: datetime


class MeusBeneficios(Esquema):
    pontos: int
    """Pontos ganhos por participação, desde o início."""
    saldo: int
    """O que ainda dá para gastar."""
    como_ganhar: list[str]
    catalogo: list[ItemDoCatalogo]
    resgates: list[MeuResgate]


async def _resgates(sessao: AsyncSession, trabalhador_id: str) -> list[Resgate]:
    linhas = await sessao.scalars(
        select(Resgate).where(Resgate.trabalhador_id == trabalhador_id).order_by(Resgate.criado_em.desc())
    )
    return list(linhas)


def _como_ganhar() -> list[str]:
    return [
        f"{PONTOS_POR_PASSO} pontos por passo do plano feito",
        f"{PONTOS_POR_SEMANA} pontos por semana seguida de cuidado",
    ]


async def resumo(
    sessao: AsyncSession, trabalhador_id: str, passos_feitos: int, semanas_seguidas: int
) -> MeusBeneficios:
    ganhos = pontos_ganhos(passos_feitos, semanas_seguidas)
    resgates = await _resgates(sessao, trabalhador_id)
    atual = saldo(ganhos, sum(r.pontos for r in resgates))
    titulos = {b.id: b.titulo for b in CATALOGO}
    return MeusBeneficios(
        pontos=ganhos,
        saldo=atual,
        como_ganhar=_como_ganhar(),
        catalogo=[
            ItemDoCatalogo(
                id=b.id,
                titulo=b.titulo,
                descricao=b.descricao,
                pontos=b.pontos,
                icone=b.icone,
                pode_resgatar=pode_resgatar(atual, b.pontos),
            )
            for b in CATALOGO
        ],
        resgates=[
            MeuResgate(
                id=r.id,
                beneficio_id=r.beneficio_id,
                titulo=titulos.get(r.beneficio_id, "Benefício"),
                codigo=r.codigo,
                pontos=r.pontos,
                criado_em=r.criado_em,
            )
            for r in resgates
        ],
    )


async def resgatar(
    sessao: AsyncSession, trabalhador_id: str, beneficio_id: str, passos_feitos: int, semanas_seguidas: int
) -> None:
    item = beneficio(beneficio_id)
    if item is None:
        raise NaoEncontrado("Esse benefício não existe.")
    resgates = await _resgates(sessao, trabalhador_id)
    atual = saldo(pontos_ganhos(passos_feitos, semanas_seguidas), sum(r.pontos for r in resgates))
    if not pode_resgatar(atual, item.pontos):
        raise RegraViolada("Você ainda não tem pontos para esse benefício.")
    sessao.add(
        Resgate(
            id=novo_id(),
            trabalhador_id=trabalhador_id,
            beneficio_id=item.id,
            codigo=codigo_do_resgate(trabalhador_id, item.id, len(resgates)),
            pontos=item.pontos,
            criado_em=relogio.agora(),
        )
    )
