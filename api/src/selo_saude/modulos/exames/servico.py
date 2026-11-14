"""Interface pública dos exames: o andamento do pedido e o resultado em linguagem simples.

Duas visões, de propósito. O trabalhador vê os próprios resultados, explicados. A enfermagem, neste
sistema, vê só o andamento: o laudo com os valores continua no S+.
"""

from collections import defaultdict
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante
from selo_saude.nucleo.eventos import publicar

from .eventos import ExameColetado, ResultadoLiberado, ResultadoVisto
from .modelos import Exame

StatusExame = Literal["pedido", "coletado", "resultado"]


class ItemDoResultado(Esquema):
    nome: str
    """Nome técnico, como no laudo."""
    simples: str
    """O que é, em linguagem do dia a dia."""
    valor: str
    referencia: str
    situacao: Literal["normal", "atencao"]
    """atencao = vale conversar no retorno. Nunca "grave": isso é conversa com a médica."""
    explicacao: str


class AndamentoDoExame(Esquema):
    """O que a enfermagem vê: em que etapa está e se a pessoa já abriu. Sem valores."""

    id: str
    titulo: str
    status: StatusExame
    resultado_visto: bool


class DadosExame(AndamentoDoExame):
    """O que o próprio trabalhador vê, com o resultado explicado."""

    pedido_por: str
    data_pedido: Instante
    data_coleta: Instante | None
    data_resultado: Instante | None
    passo_id: str | None
    itens: list[ItemDoResultado]


async def listar(sessao: AsyncSession, trabalhador_id: str) -> list[DadosExame]:
    """Exames da pessoa, do mais recente para o mais antigo."""
    exames = await sessao.scalars(
        select(Exame).where(Exame.trabalhador_id == trabalhador_id).order_by(Exame.data_pedido.desc())
    )
    dados = [DadosExame.model_validate(e) for e in exames]
    # O resultado só sai do servidor depois de liberado: não basta a tela esconder.
    return [d if d.status == "resultado" else d.model_copy(update={"itens": []}) for d in dados]


async def andamento_por_trabalhador(sessao: AsyncSession) -> dict[str, list[AndamentoDoExame]]:
    andamentos: dict[str, list[AndamentoDoExame]] = defaultdict(list)
    for exame in await sessao.scalars(select(Exame).order_by(Exame.data_pedido.desc())):
        andamentos[exame.trabalhador_id].append(AndamentoDoExame.model_validate(exame))
    return andamentos


async def registrar_coleta(sessao: AsyncSession, trabalhador_id: str, passo_id: str) -> None:
    """Marcar o passo de exames como feito é a pessoa dizendo que fez a coleta."""
    exame = await sessao.scalar(
        select(Exame).where(
            Exame.trabalhador_id == trabalhador_id, Exame.passo_id == passo_id, Exame.status == "pedido"
        )
    )
    if exame is None:
        return
    exame.status = "coletado"
    exame.data_coleta = relogio.agora()
    await publicar(sessao, ExameColetado(trabalhador_id=trabalhador_id, titulo=exame.titulo))


async def liberar_resultado(sessao: AsyncSession, trabalhador_id: str, exame_id: str) -> None:
    """O laboratório liberou o resultado. No produto isso chega do S+; na demonstração, a enfermeira simula."""
    exame = await sessao.get(Exame, exame_id)
    if exame is None or exame.trabalhador_id != trabalhador_id:
        raise NaoEncontrado("Exame não encontrado")
    if exame.status == "resultado":
        return
    agora = relogio.agora()
    exame.data_coleta = exame.data_coleta or agora
    exame.data_resultado = agora
    exame.status = "resultado"
    exame.resultado_visto = False
    await publicar(sessao, ResultadoLiberado(trabalhador_id=trabalhador_id, titulo=exame.titulo))


async def ver_resultados(sessao: AsyncSession, trabalhador_id: str) -> None:
    """A pessoa abriu "Meus exames": some o aviso de resultado novo."""
    novos = list(
        await sessao.scalars(
            select(Exame).where(Exame.trabalhador_id == trabalhador_id, Exame.resultado_visto.is_(False))
        )
    )
    if not novos:
        return
    for exame in novos:
        exame.resultado_visto = True
    await publicar(sessao, ResultadoVisto(trabalhador_id=trabalhador_id))
