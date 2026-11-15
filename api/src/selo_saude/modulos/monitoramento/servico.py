"""Interface pública do monitoramento: a fila da enfermagem e o registro do que foi feito."""

import asyncio
import time
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.cadastro.servico import DadosTrabalhador
from selo_saude.modulos.exames import servico as exames
from selo_saude.modulos.exames.servico import AndamentoDoExame
from selo_saude.modulos.plano import servico as plano
from selo_saude.modulos.plano.servico import DadosPlano
from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante, novo_id
from selo_saude.nucleo.eventos import publicar
from selo_saude.nucleo.tempo_real import TUDO, mudancas_desde, versao_dos_dados

from .eventos import CheckinRespondido, MonitoramentoRegistrado
from .modelos import Acompanhamento, Registro
from .regras import (
    ROTULO_CADENCIA,
    ROTULO_SITUACAO,
    CodigoSituacao,
    DoencaCronica,
    Engajamento,
    MensagemDaCadencia,
    RegistroHistorico,
    Retrato,
    RiscoFalta,
    Situacao,
    doenca_cronica,
    engajamento,
    mensagem_do_dia,
    prazo_retorno,
    risco_falta,
    situacao,
)


class Desfecho(Esquema):
    """Desfecho do monitoramento, com os mesmos campos da ficha Gestão de Retorno."""

    feito_contato: bool
    agendamento_realizado: bool
    mensagem_enviada: bool
    aguardando_retorno: bool
    observacao: str = ""
    proximo_monitoramento: datetime


class LinhaDaFila(Esquema):
    """Uma pessoa na fila da enfermagem, já com a situação e o risco de falta calculados."""

    trabalhador: DadosTrabalhador
    consulta: DadosConsulta | None
    plano: DadosPlano
    exames: list[AndamentoDoExame]
    """Só o andamento. O laudo com os valores fica no S+."""
    historico: list[RegistroHistorico]
    ultimo_contato_enfermagem: Instante | None
    proximo_monitoramento: Instante
    pediu_contato: bool
    prazo_retorno: Instante
    situacao: Situacao
    risco_falta: RiscoFalta
    engajamento: Engajamento
    doenca_cronica: DoencaCronica
    """Lida do risco do SESI, sem diagnóstico (que fica no S+)."""


@dataclass
class _Item:
    """Uma pessoa da carteira com o que filtra e ordena já calculado. A linha completa só é montada se for exibida."""

    retrato: Retrato
    acompanhamento: Acompanhamento
    situacao: Situacao
    risco_falta: RiscoFalta
    prazo: datetime


# A carteira inteira (10 mil pessoas) leva segundos para calcular, então o cálculo fica guardado, uma pessoa por
# chave. Cada gravação avisa quem mudou (canal "trabalhador:<id>", pelo NOTIFY do Postgres, que chega a todas as
# instâncias): só essas pessoas são recalculadas. Reinício dos dados, aviso perdido ou validade vencida recalculam
# tudo. Não é estado de negócio: é um derivado do banco, sempre descartável.
_VALIDADE_DA_CARTEIRA = 15 * 60  # segundos
_PREFIXO_DA_PESSOA = "trabalhador:"


@dataclass
class _CarteiraGuardada:
    versao: int
    dia: date
    calculada_em: float
    itens: dict[str, _Item]


_guardada: _CarteiraGuardada | None = None
_calculando = asyncio.Lock()


async def _carteira(sessao: AsyncSession) -> list[_Item]:
    # Uma conta por vez: quem chega enquanto a carteira está sendo calculada espera e reaproveita o resultado.
    async with _calculando:
        return await _carteira_atual(sessao)


async def _carteira_atual(sessao: AsyncSession) -> list[_Item]:
    global _guardada
    versao, dia, agora = versao_dos_dados(), relogio.local(relogio.agora()).date(), time.monotonic()
    g = _guardada
    if g is not None and g.dia == dia and agora - g.calculada_em < _VALIDADE_DA_CARTEIRA:
        mudou = mudancas_desde(g.versao)
        if mudou is not None and TUDO not in mudou:
            pessoas = {d.removeprefix(_PREFIXO_DA_PESSOA) for d in mudou if d.startswith(_PREFIXO_DA_PESSOA)}
            for trabalhador_id in pessoas:
                item = await _item_de(sessao, trabalhador_id)
                if item is None:
                    g.itens.pop(trabalhador_id, None)
                else:
                    g.itens[trabalhador_id] = item
            g.versao = versao
            return list(g.itens.values())
    itens = await _calcular_carteira(sessao)
    _guardada = _CarteiraGuardada(versao, dia, agora, {i.retrato.trabalhador.id: i for i in itens})
    return itens


async def aquecer(sessao: AsyncSession) -> None:
    """Deixa a carteira calculada, para a próxima tela não esperar."""
    await _carteira(sessao)


async def _item_de(sessao: AsyncSession, trabalhador_id: str) -> _Item | None:
    """Uma pessoa só, lida de novo do banco (depois de uma mudança nela)."""
    acompanhamento = await sessao.get(Acompanhamento, trabalhador_id, populate_existing=True)
    if acompanhamento is None:
        return None
    try:
        trabalhador = await cadastro.obter(sessao, trabalhador_id)
        dados_do_plano = await plano.obter(sessao, trabalhador_id)
    except NaoEncontrado:
        return None
    registros = await sessao.execute(
        select(Registro.__table__)
        .where(Registro.trabalhador_id == trabalhador_id)
        .order_by(Registro.data, Registro.sequencia)
    )
    retrato = Retrato(
        trabalhador=trabalhador,
        consulta=await agenda.obter(sessao, trabalhador_id),
        plano=dados_do_plano,
        historico=[RegistroHistorico.model_validate(r) for r in registros],
        ultimo_contato_enfermagem=acompanhamento.ultimo_contato_enfermagem,
        pediu_contato=acompanhamento.pediu_contato,
    )
    hoje = relogio.agora()
    return _Item(
        retrato, acompanhamento, situacao(retrato, hoje), risco_falta(retrato, hoje), prazo_retorno(trabalhador)
    )


async def _calcular_carteira(sessao: AsyncSession) -> list[_Item]:
    hoje = relogio.agora()
    consultas = await agenda.por_trabalhador(sessao)
    planos = await plano.por_trabalhador(sessao)
    acompanhamentos = {a.trabalhador_id: a for a in await sessao.scalars(select(Acompanhamento))}
    historicos: dict[str, list[RegistroHistorico]] = defaultdict(list)
    for registro in await sessao.execute(select(Registro.__table__).order_by(Registro.data, Registro.sequencia)):
        # A partir do dicionário da linha: mais rápido que ler atributo por atributo (são dezenas de milhares).
        historicos[registro.trabalhador_id].append(RegistroHistorico.model_validate(registro._mapping))

    itens = []
    for trabalhador in await cadastro.listar(sessao):
        acompanhamento = acompanhamentos.get(trabalhador.id)
        if acompanhamento is None or trabalhador.id not in planos:
            continue
        retrato = Retrato(
            trabalhador=trabalhador,
            consulta=consultas.get(trabalhador.id),
            plano=planos[trabalhador.id],
            historico=historicos[trabalhador.id],
            ultimo_contato_enfermagem=acompanhamento.ultimo_contato_enfermagem,
            pediu_contato=acompanhamento.pediu_contato,
        )
        itens.append(
            _Item(
                retrato, acompanhamento, situacao(retrato, hoje), risco_falta(retrato, hoje), prazo_retorno(trabalhador)
            )
        )
    return itens


class PessoaNaCarteira(Esquema):
    """O que a lista e o pipeline mostram de cada pessoa. A ficha completa (histórico, plano, exames) vem de
    `ficha`, só quando a enfermeira abre a pessoa: assim a página da carteira fica leve."""

    trabalhador: DadosTrabalhador
    consulta: DadosConsulta | None
    status_plano: str
    prazo_retorno: Instante
    situacao: Situacao
    risco_falta: RiscoFalta


def _pessoas(itens: list[_Item]) -> list[PessoaNaCarteira]:
    return [
        PessoaNaCarteira(
            trabalhador=i.retrato.trabalhador,
            consulta=i.retrato.consulta,
            status_plano=i.retrato.plano.status,
            prazo_retorno=i.prazo,
            situacao=i.situacao,
            risco_falta=i.risco_falta,
        )
        for i in itens
    ]


async def ficha(sessao: AsyncSession, trabalhador_id: str) -> LinhaDaFila:
    """A pessoa completa, para a ficha aberta no painel."""
    item = next((i for i in await _carteira(sessao) if i.retrato.trabalhador.id == trabalhador_id), None)
    if item is None:
        raise NaoEncontrado("Pessoa não encontrada na carteira")
    andamento = await exames.andamento_por_trabalhador(sessao)
    return _linhas([item], andamento)[0]


def _linhas(itens: list[_Item], andamentos: dict[str, list[AndamentoDoExame]]) -> list[LinhaDaFila]:
    hoje = relogio.agora()
    return [
        LinhaDaFila(
            trabalhador=i.retrato.trabalhador,
            consulta=i.retrato.consulta,
            plano=i.retrato.plano,
            exames=andamentos.get(i.retrato.trabalhador.id, []),
            historico=i.retrato.historico,
            ultimo_contato_enfermagem=i.acompanhamento.ultimo_contato_enfermagem,
            proximo_monitoramento=i.acompanhamento.proximo_monitoramento,
            pediu_contato=i.acompanhamento.pediu_contato,
            prazo_retorno=i.prazo,
            situacao=i.situacao,
            risco_falta=i.risco_falta,
            engajamento=engajamento(i.retrato, hoje),
            doenca_cronica=doenca_cronica(i.retrato.trabalhador.risco),
        )
        for i in itens
    ]


async def fila(sessao: AsyncSession) -> list[LinhaDaFila]:
    """Todas as pessoas acompanhadas, cada uma com situação e risco calculados. Para a carteira inteira na tela,
    use `pagina`, `pipeline` e `resumo`, que filtram no servidor."""
    return _linhas(await _carteira(sessao), await exames.andamento_por_trabalhador(sessao))


# ---------------------------------------------------------------- carteira em escala: filtros, página, pipeline


NivelRiscoFalta = Literal["alto", "medio", "baixo"]


class FiltrosDaFila(Esquema):
    busca: str = ""
    """Nome, matrícula ou CPF."""
    situacoes: list[CodigoSituacao] = []
    precisa_acao: bool | None = None
    risco_falta: list[NivelRiscoFalta] = []
    risco: list[int] = []
    """Risco clínico, de 1 a 4."""
    empresa: str | None = None
    enfermeira: str | None = None


Ordem = Literal["prioridade", "risco_falta", "prazo", "nome"]


def _sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn")


def _filtrar(itens: list[_Item], f: FiltrosDaFila, com_situacao: bool = True) -> list[_Item]:
    busca = _sem_acento(f.busca.strip())
    digitos = "".join(c for c in busca if c.isdigit())

    def passa(i: _Item) -> bool:
        t = i.retrato.trabalhador
        if (
            busca
            and busca not in _sem_acento(t.nome)
            and not (digitos and (digitos in t.matricula or digitos in (t.cpf or "")))
        ):
            return False
        if com_situacao and f.situacoes and i.situacao.codigo not in f.situacoes:
            return False
        if com_situacao and f.precisa_acao is not None and i.situacao.precisa_acao != f.precisa_acao:
            return False
        if f.risco_falta and i.risco_falta.nivel not in f.risco_falta:
            return False
        if f.risco and t.risco not in f.risco:
            return False
        if f.empresa and t.empresa != f.empresa:
            return False
        return not (f.enfermeira and t.enfermeira != f.enfermeira)

    return [i for i in itens if passa(i)]


def _ordenar(itens: list[_Item], ordem: Ordem) -> list[_Item]:
    chaves = {
        "prioridade": lambda i: (i.situacao.prioridade, -i.risco_falta.pontos, i.prazo),
        "risco_falta": lambda i: (-i.risco_falta.pontos, i.situacao.prioridade, i.prazo),
        "prazo": lambda i: (i.prazo, i.situacao.prioridade),
        "nome": lambda i: _sem_acento(i.retrato.trabalhador.nome),
    }
    return sorted(itens, key=chaves[ordem])


class ResumoDaFila(Esquema):
    """Os números do topo do painel, já com os filtros (menos o de situação, que é o que os números escolhem)."""

    total: int
    precisam_acao: int
    por_situacao: dict[str, int]
    por_risco_falta: dict[str, int]
    motivos: dict[str, int]
    """Dificuldades em aberto, por motivo do "não consegui"."""
    empresas: list[str]
    enfermeiras: list[str]


async def resumo(sessao: AsyncSession, filtros: FiltrosDaFila) -> ResumoDaFila:
    todos = await _carteira(sessao)
    return _resumo_de(_filtrar(todos, filtros, com_situacao=False), todos)


def _resumo_de(itens: list[_Item], todos: list[_Item]) -> ResumoDaFila:
    motivos: dict[str, int] = defaultdict(int)
    por_situacao: dict[str, int] = dict.fromkeys(ROTULO_SITUACAO, 0)
    por_risco: dict[str, int] = {"alto": 0, "medio": 0, "baixo": 0}
    precisam_acao = 0
    for i in itens:
        por_situacao[i.situacao.codigo] += 1
        por_risco[i.risco_falta.nivel] += 1
        precisam_acao += i.situacao.precisa_acao
        for d in i.retrato.plano.dificuldades_abertas:
            motivos[d.motivo] += 1
    return ResumoDaFila(
        total=len(itens),
        precisam_acao=precisam_acao,
        por_situacao=por_situacao,
        por_risco_falta=por_risco,
        motivos=dict(motivos),
        empresas=sorted({i.retrato.trabalhador.empresa for i in todos}),
        enfermeiras=sorted({i.retrato.trabalhador.enfermeira for i in todos}),
    )


class PaginaDaFila(Esquema):
    """Visão em lista: uma página da carteira filtrada, com o resumo para o topo da tela."""

    total: int
    pagina: int
    por_pagina: int
    linhas: list[PessoaNaCarteira]
    resumo: ResumoDaFila


async def pagina(
    sessao: AsyncSession, filtros: FiltrosDaFila, ordem: Ordem = "prioridade", numero: int = 1, por_pagina: int = 50
) -> PaginaDaFila:
    todos = await _carteira(sessao)
    sem_situacao = _filtrar(todos, filtros, com_situacao=False)
    sem_filtro_de_situacao = FiltrosDaFila(situacoes=filtros.situacoes, precisa_acao=filtros.precisa_acao)
    itens = _ordenar(_filtrar(sem_situacao, sem_filtro_de_situacao), ordem)
    numero = max(1, numero)
    trecho = itens[(numero - 1) * por_pagina : numero * por_pagina]
    return PaginaDaFila(
        total=len(itens),
        pagina=numero,
        por_pagina=por_pagina,
        linhas=_pessoas(trecho),
        resumo=_resumo_de(sem_situacao, todos),
    )


class ColunaDoPipeline(Esquema):
    situacao: CodigoSituacao
    total: int
    linhas: list[PessoaNaCarteira]
    """As primeiras da coluna, na ordem pedida."""


class PipelineDaFila(Esquema):
    """Visão em pipeline: uma coluna por situação, com o total e as primeiras pessoas de cada uma."""

    colunas: list[ColunaDoPipeline]
    resumo: ResumoDaFila


async def pipeline(
    sessao: AsyncSession, filtros: FiltrosDaFila, ordem: Ordem = "prioridade", por_coluna: int = 12
) -> PipelineDaFila:
    todos = await _carteira(sessao)
    filtrados = _filtrar(todos, filtros, com_situacao=False)
    por_codigo: dict[str, list[_Item]] = defaultdict(list)
    for i in _ordenar(filtrados, ordem):
        por_codigo[i.situacao.codigo].append(i)
    colunas = [
        ColunaDoPipeline(
            situacao=codigo, total=len(por_codigo[codigo]), linhas=_pessoas(por_codigo[codigo][:por_coluna])
        )
        for codigo in ROTULO_SITUACAO
    ]
    return PipelineDaFila(colunas=colunas, resumo=_resumo_de(filtrados, todos))


class EnvioDaCadencia(Esquema):
    trabalhador_id: str
    nome: str
    mensagem: MensagemDaCadencia
    rotulo: str


LOTE_DA_CADENCIA = 50
"""Mensagens por rodada do agendador. Numa carteira de 10 mil pessoas, o envio vai em lotes, pela prioridade:
cada rodada é uma transação curta, e um erro não segura todas as outras mensagens."""


async def cadencia_do_dia(sessao: AsyncSession, limite: int = LOTE_DA_CADENCIA) -> list[EnvioDaCadencia]:
    """O que o agendador manda agora, pessoa por pessoa, das mais urgentes para as mais tranquilas, até `limite`.
    Só decide; quem envia é a comunicação. Rodar de novo pega o próximo lote (quem já recebeu hoje não repete)."""
    hoje = relogio.agora()
    envios = []
    for item in _ordenar(await _carteira(sessao), "prioridade"):
        mensagem = mensagem_do_dia(item.retrato, item.acompanhamento.proximo_monitoramento, hoje)
        if mensagem is not None:
            envios.append(
                EnvioDaCadencia(
                    trabalhador_id=item.retrato.trabalhador.id,
                    nome=item.retrato.trabalhador.nome,
                    mensagem=mensagem,
                    rotulo=ROTULO_CADENCIA[mensagem],
                )
            )
            if len(envios) >= limite:
                break
    return envios


async def registrar(sessao: AsyncSession, trabalhador_id: str, desfecho: Desfecho) -> None:
    acompanhamento = await _exigir(sessao, trabalhador_id)
    if desfecho.feito_contato:
        acompanhamento.pediu_contato = False
        acompanhamento.ultimo_contato_enfermagem = relogio.agora()
    acompanhamento.proximo_monitoramento = desfecho.proximo_monitoramento

    desfechos = ["contato feito" if desfecho.feito_contato else "sem contato"]
    if desfecho.agendamento_realizado:
        desfechos.append("agendamento realizado")
    if desfecho.mensagem_enviada:
        desfechos.append("mensagem enviada")
    if desfecho.aguardando_retorno:
        desfechos.append("aguardando retorno")
    nota = f"{', '.join(desfechos)} · próximo: {relogio.data(desfecho.proximo_monitoramento)}"
    if desfecho.observacao.strip():
        nota += f" — {desfecho.observacao.strip()}"
    await anotar(sessao, trabalhador_id, "monitoramento", nota)
    await publicar(sessao, MonitoramentoRegistrado(trabalhador_id=trabalhador_id))


async def responder_checkin(sessao: AsyncSession, trabalhador_id: str, tudo_bem: bool) -> None:
    if not tudo_bem:
        (await _exigir(sessao, trabalhador_id)).pediu_contato = True
    await publicar(sessao, CheckinRespondido(trabalhador_id=trabalhador_id, tudo_bem=tudo_bem))


async def marcar_contato(sessao: AsyncSession, trabalhador_id: str) -> None:
    (await _exigir(sessao, trabalhador_id)).ultimo_contato_enfermagem = relogio.agora()


async def anotar(sessao: AsyncSession, trabalhador_id: str, tipo: str, nota: str | None = None) -> None:
    """Acrescenta um registro à linha do tempo do cuidado."""
    sessao.add(Registro(id=novo_id(), trabalhador_id=trabalhador_id, tipo=tipo, data=relogio.agora(), nota=nota))
    await sessao.flush()


async def _exigir(sessao: AsyncSession, trabalhador_id: str) -> Acompanhamento:
    acompanhamento = await sessao.get(Acompanhamento, trabalhador_id)
    if acompanhamento is None:
        raise NaoEncontrado("Acompanhamento não encontrado")
    return acompanhamento
