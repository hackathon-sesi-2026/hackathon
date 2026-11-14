"""Interface pública do monitoramento: a fila da enfermagem e o registro do que foi feito."""

from collections import defaultdict
from datetime import datetime

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

from .eventos import CheckinRespondido, MonitoramentoRegistrado
from .modelos import Acompanhamento, Registro
from .regras import RegistroHistorico, Retrato, RiscoFalta, Situacao, prazo_retorno, risco_falta, situacao


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


async def fila(sessao: AsyncSession) -> list[LinhaDaFila]:
    """Todas as pessoas acompanhadas. A tela ordena; aqui cada uma já vem com situação e risco calculados."""
    hoje = relogio.agora()
    consultas = await agenda.por_trabalhador(sessao)
    planos = await plano.por_trabalhador(sessao)
    andamentos = await exames.andamento_por_trabalhador(sessao)
    acompanhamentos = {a.trabalhador_id: a for a in await sessao.scalars(select(Acompanhamento))}
    historicos: dict[str, list[RegistroHistorico]] = defaultdict(list)
    for registro in await sessao.scalars(select(Registro).order_by(Registro.data, Registro.sequencia)):
        historicos[registro.trabalhador_id].append(RegistroHistorico.model_validate(registro))

    linhas = []
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
        linhas.append(
            LinhaDaFila(
                trabalhador=trabalhador,
                consulta=retrato.consulta,
                plano=retrato.plano,
                exames=andamentos.get(trabalhador.id, []),
                historico=retrato.historico,
                ultimo_contato_enfermagem=acompanhamento.ultimo_contato_enfermagem,
                proximo_monitoramento=acompanhamento.proximo_monitoramento,
                pediu_contato=acompanhamento.pediu_contato,
                prazo_retorno=prazo_retorno(trabalhador),
                situacao=situacao(retrato, hoje),
                risco_falta=risco_falta(retrato, hoje),
            )
        )
    return linhas


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
