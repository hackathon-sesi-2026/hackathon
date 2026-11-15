"""Interface pública do plano de cuidado: passos, dificuldades, checagem de entendimento e selos."""

from collections import defaultdict
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante, novo_id
from selo_saude.nucleo.eventos import EventoDominio, publicar

from .eventos import (
    DificuldadeRelatada,
    DificuldadeResolvida,
    HabitoRespondido,
    PassoDesfeito,
    PassoFeito,
    PlanoEnviado,
    PlanoRecebido,
    SeloConquistado,
    TeachBackRespondido,
)
from .modelos import Dificuldade, Passo, PlanoCuidado
from .regras import ACAO_POR_MOTIVO, Motivo, Selo, opcoes_da_checagem, selo_do_marco, selos_de

StatusPlano = Literal["nao_enviado", "enviado", "recebido"]
Categoria = Literal["exames", "nutricao", "atividade", "vacina", "psicologia", "remedio", "retorno", "habitos"]
Origem = Literal["plano", "checkin", "teach_back"]


class DadosPasso(Esquema):
    id: str
    categoria: Categoria
    titulo: str
    detalhe: str
    ganho: str
    prazo: Instante
    feito: bool
    itens_tecnicos: list[str] | None


class DadosDificuldade(Esquema):
    id: str
    motivo: Motivo
    passo_id: str | None
    origem: Origem
    data: Instante
    resolvida: bool
    nota: str | None
    acao_sugerida: str


class DadosPlano(Esquema):
    status: StatusPlano
    data_envio: Instante | None
    teach_back: Literal["pendente", "acertou", "errou"]
    semanas_seguidas: int
    selos: list[Selo]
    passos: list[DadosPasso]
    dificuldades: list[DadosDificuldade]

    @property
    def proximo_passo(self) -> DadosPasso | None:
        return next((p for p in self.passos if not p.feito), None)

    @property
    def dificuldades_abertas(self) -> list[DadosDificuldade]:
        return [d for d in self.dificuldades if not d.resolvida]

    def opcoes_da_checagem(self, trabalhador_id: str) -> list[str] | None:
        """Opções da pergunta de checagem, enquanto ela estiver pendente."""
        if self.teach_back != "pendente" or self.proximo_passo is None:
            return None
        return opcoes_da_checagem(trabalhador_id, self.proximo_passo.titulo)


# ---------------------------------------------------------------- leitura


async def obter(sessao: AsyncSession, trabalhador_id: str) -> DadosPlano:
    plano = await _exigir(sessao, trabalhador_id)
    passos = await sessao.scalars(select(Passo).where(Passo.trabalhador_id == trabalhador_id).order_by(Passo.ordem))
    dificuldades = await sessao.scalars(
        select(Dificuldade).where(Dificuldade.trabalhador_id == trabalhador_id).order_by(Dificuldade.data)
    )
    return _dados(plano, list(passos), list(dificuldades))


async def por_trabalhador(sessao: AsyncSession) -> dict[str, DadosPlano]:
    # A carteira inteira tem dezenas de milhares de passos: lidos como linhas simples, sem montar objetos do ORM.
    # Validados a partir do dicionário da linha: bem mais rápido que ler atributo por atributo.
    passos: dict[str, list] = defaultdict(list)
    for p in await sessao.execute(select(Passo.__table__).order_by(Passo.ordem)):
        passos[p.trabalhador_id].append(DadosPasso.model_validate(p._mapping))
    dificuldades: dict[str, list[Dificuldade]] = defaultdict(list)
    for dificuldade in await sessao.scalars(select(Dificuldade).order_by(Dificuldade.data)):
        dificuldades[dificuldade.trabalhador_id].append(dificuldade)
    planos = await sessao.scalars(select(PlanoCuidado))
    return {p.trabalhador_id: _dados(p, passos[p.trabalhador_id], dificuldades[p.trabalhador_id]) for p in planos}


def _dados(plano: PlanoCuidado, passos: list, dificuldades: list[Dificuldade]) -> DadosPlano:
    return DadosPlano(
        status=plano.status,  # type: ignore[arg-type]
        data_envio=plano.data_envio,
        teach_back=plano.teach_back,  # type: ignore[arg-type]
        semanas_seguidas=plano.semanas_seguidas,
        selos=selos_de(plano.semanas_seguidas),
        passos=[p if isinstance(p, DadosPasso) else DadosPasso.model_validate(p) for p in passos],
        dificuldades=[
            DadosDificuldade(
                id=d.id,
                motivo=d.motivo,  # type: ignore[arg-type]
                passo_id=d.passo_id,
                origem=d.origem,  # type: ignore[arg-type]
                data=d.data,
                resolvida=d.resolvida,
                nota=d.nota,
                acao_sugerida=ACAO_POR_MOTIVO[d.motivo],
            )
            for d in dificuldades
        ],
    )


# ---------------------------------------------------------------- ações da equipe de saúde


async def enviar(sessao: AsyncSession, trabalhador_id: str) -> None:
    plano = await _exigir(sessao, trabalhador_id)
    if plano.status != "recebido":
        plano.status = "enviado"
    plano.data_envio = relogio.agora()
    await publicar(sessao, PlanoEnviado(trabalhador_id=trabalhador_id))


async def resolver_dificuldade(sessao: AsyncSession, trabalhador_id: str, dificuldade_id: str, nota: str) -> None:
    dificuldade = await sessao.get(Dificuldade, dificuldade_id)
    if dificuldade is None or dificuldade.trabalhador_id != trabalhador_id:
        raise NaoEncontrado("Dificuldade não encontrada")
    dificuldade.resolvida = True
    dificuldade.nota = nota.strip() or None
    if dificuldade.origem == "teach_back":
        # A enfermeira explicou o plano: a dúvida que a checagem revelou está tratada.
        (await _exigir(sessao, trabalhador_id)).teach_back = "acertou"
    await publicar(
        sessao, DificuldadeResolvida(trabalhador_id=trabalhador_id, motivo=dificuldade.motivo, nota=dificuldade.nota)
    )


# ---------------------------------------------------------------- ações do trabalhador


async def abrir(sessao: AsyncSession, trabalhador_id: str) -> None:
    """Abrir o plano marca "recebido". Só a primeira vez gera evento."""
    plano = await _exigir(sessao, trabalhador_id)
    if plano.status == "recebido":
        return
    plano.status = "recebido"
    await publicar(sessao, PlanoRecebido(trabalhador_id=trabalhador_id))


async def marcar_passo(sessao: AsyncSession, trabalhador_id: str, passo_id: str, feito: bool) -> None:
    passo = await _exigir_passo(sessao, trabalhador_id, passo_id)
    passo.feito = feito
    if feito:
        await _publicar_com_cuidado(
            sessao, PassoFeito(trabalhador_id=trabalhador_id, passo_id=passo_id, titulo=passo.titulo)
        )
    else:
        await publicar(sessao, PassoDesfeito(trabalhador_id=trabalhador_id))


async def responder_habito(sessao: AsyncSession, trabalhador_id: str, passo_id: str, fez: bool) -> None:
    """Resposta ao check-in de hábito. O "não" só registra: o motivo vem em seguida, em `relatar_dificuldade`."""
    evento = HabitoRespondido(trabalhador_id=trabalhador_id, passo_id=passo_id, fez=fez)
    if fez:
        (await _exigir_passo(sessao, trabalhador_id, passo_id)).feito = True
        await _publicar_com_cuidado(sessao, evento)
    else:
        await publicar(sessao, evento)


async def relatar_dificuldade(
    sessao: AsyncSession, trabalhador_id: str, motivo: Motivo, origem: Origem, passo_id: str | None
) -> None:
    sessao.add(
        Dificuldade(
            id=novo_id(),
            trabalhador_id=trabalhador_id,
            motivo=motivo,
            passo_id=passo_id,
            origem=origem,
            data=relogio.agora(),
            resolvida=False,
        )
    )
    await sessao.flush()
    await publicar(sessao, DificuldadeRelatada(trabalhador_id=trabalhador_id, motivo=motivo, origem=origem))


async def responder_checagem(sessao: AsyncSession, trabalhador_id: str, resposta: str) -> None:
    """Teach-back: errar não reprova ninguém, vira um aviso para a enfermeira explicar o plano."""
    dados = await obter(sessao, trabalhador_id)
    proximo = dados.proximo_passo
    acertou = proximo is not None and resposta == proximo.titulo
    (await _exigir(sessao, trabalhador_id)).teach_back = "acertou" if acertou else "errou"
    await publicar(sessao, TeachBackRespondido(trabalhador_id=trabalhador_id, acertou=acertou))
    if not acertou:
        await relatar_dificuldade(sessao, trabalhador_id, "nao_entendi", "teach_back", proximo.id if proximo else None)


# ---------------------------------------------------------------- sequência semanal e selos


async def contar_semana(sessao: AsyncSession, trabalhador_id: str) -> None:
    """A primeira ação de cuidado da semana soma 1 na sequência. Ao bater um marco, a pessoa ganha um selo."""
    plano = await _exigir(sessao, trabalhador_id)
    semana = relogio.semana_iso(relogio.agora())
    if plano.ultima_semana_contada == semana:
        return
    plano.ultima_semana_contada = semana
    plano.semanas_seguidas += 1
    selo = selo_do_marco(plano.semanas_seguidas)
    if selo:
        await publicar(
            sessao,
            SeloConquistado(trabalhador_id=trabalhador_id, nome=selo.nome, emoji=selo.emoji, semanas=selo.semanas),
        )


async def _publicar_com_cuidado(sessao: AsyncSession, evento: EventoDominio) -> None:
    """Publica o evento e conta a semana em seguida: o selo sempre chega depois da resposta à ação."""
    await publicar(sessao, evento)
    await contar_semana(sessao, evento.trabalhador_id)  # type: ignore[attr-defined]


# ---------------------------------------------------------------- internos


async def _exigir(sessao: AsyncSession, trabalhador_id: str) -> PlanoCuidado:
    plano = await sessao.get(PlanoCuidado, trabalhador_id)
    if plano is None:
        raise NaoEncontrado("Plano de cuidado não encontrado")
    return plano


async def _exigir_passo(sessao: AsyncSession, trabalhador_id: str, passo_id: str) -> Passo:
    passo = await sessao.get(Passo, passo_id)
    if passo is None or passo.trabalhador_id != trabalhador_id:
        raise NaoEncontrado("Passo não encontrado")
    return passo
