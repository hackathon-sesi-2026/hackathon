"""Interface pública da comunicação: a conversa com o trabalhador pelo canal que o SESI já usa."""

from typing import Literal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.integracoes.whatsapp import Botao, Destinatario, whatsapp
from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.plano import servico as plano
from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import RegraViolada
from selo_saude.nucleo.esquema import Esquema, Instante, novo_id
from selo_saude.nucleo.eventos import publicar

from . import textos
from .eventos import CheckinEnviado, CheckinHabitoEnviado, LembreteEnviado, LinkPessoalEnviado
from .modelos import Mensagem
from .textos import Texto


class DadosMensagem(Esquema):
    id: str
    de: Literal["sesi", "trabalhador"]
    texto: str
    hora: Instante
    acoes: list[str] | None
    passo_id: str | None


async def listar(sessao: AsyncSession, trabalhador_id: str) -> list[DadosMensagem]:
    mensagens = await sessao.scalars(
        select(Mensagem).where(Mensagem.trabalhador_id == trabalhador_id).order_by(Mensagem.hora, Mensagem.sequencia)
    )
    return [DadosMensagem.model_validate(m) for m in mensagens]


# ---------------------------------------------------------------- ações da equipe de saúde


async def enviar_lembrete(sessao: AsyncSession, trabalhador_id: str) -> None:
    trabalhador = await cadastro.obter(sessao, trabalhador_id)
    consulta = await agenda.obter(sessao, trabalhador_id)
    await do_sesi(sessao, trabalhador_id, textos.lembrete(trabalhador, consulta))
    await publicar(sessao, LembreteEnviado(trabalhador_id=trabalhador_id))


async def enviar_lembrete_automatico(sessao: AsyncSession, trabalhador_id: str, qual: Literal["D-3", "D-1"]) -> None:
    """No produto, um agendador dispara isto sozinho 3 dias e 1 dia antes do retorno."""
    consulta = await agenda.obter(sessao, trabalhador_id)
    if consulta is None or not consulta.em_aberto:
        raise RegraViolada("Não há retorno em aberto para lembrar")
    trabalhador = await cadastro.obter(sessao, trabalhador_id)
    await do_sesi(sessao, trabalhador_id, textos.lembrete_automatico(trabalhador, consulta, qual))
    await agenda.registrar_lembrete_automatico(sessao, trabalhador_id, qual)


async def enviar_checkin_habito(sessao: AsyncSession, trabalhador_id: str) -> None:
    trabalhador = await cadastro.obter(sessao, trabalhador_id)
    texto = textos.checkin_habito(trabalhador, await plano.obter(sessao, trabalhador_id))
    if texto is None:
        raise RegraViolada("Todos os passos do plano já foram feitos")
    await do_sesi(sessao, trabalhador_id, texto)
    await publicar(sessao, CheckinHabitoEnviado(trabalhador_id=trabalhador_id))


async def enviar_checkin(sessao: AsyncSession, trabalhador_id: str) -> None:
    """Pergunta como a pessoa está desde o último atendimento. É o contato do monitoramento pelo WhatsApp."""
    trabalhador = await cadastro.obter(sessao, trabalhador_id)
    await do_sesi(sessao, trabalhador_id, textos.checkin(trabalhador))
    await publicar(sessao, CheckinEnviado(trabalhador_id=trabalhador_id))


async def enviar_link_pessoal(sessao: AsyncSession, trabalhador_id: str) -> None:
    """Manda o link pessoal para o WhatsApp da própria pessoa. É o único jeito de o totem levar alguém ao celular:
    quem souber a matrícula de um colega, no máximo, faz o link chegar ao celular do dono."""
    trabalhador = await cadastro.obter(sessao, trabalhador_id)
    await do_sesi(sessao, trabalhador_id, textos.link_pessoal(trabalhador))
    await publicar(sessao, LinkPessoalEnviado(trabalhador_id=trabalhador_id))


# ---------------------------------------------------------------- gravação (usada também pelos manipuladores)


async def do_sesi(sessao: AsyncSession, trabalhador_id: str, texto: Texto, manter_botoes: bool = False) -> None:
    """Grava e envia uma mensagem do SESI. Os botões das mensagens anteriores deixam de valer.

    `manter_botoes` serve para avisos que não pedem resposta (um selo): os botões da mensagem
    anterior passam para a nova, e a pergunta que estava em aberto continua respondível.
    """
    acoes = texto.acoes
    if manter_botoes:
        ultima = await sessao.scalar(
            select(Mensagem)
            .where(Mensagem.trabalhador_id == trabalhador_id)
            .order_by(Mensagem.hora.desc(), Mensagem.sequencia.desc())
            .limit(1)
        )
        acoes = (ultima.acoes if ultima else None) or acoes
    await _gravar(sessao, trabalhador_id, "sesi", texto.texto, acoes or None, texto.passo_id)
    t = await cadastro.obter(sessao, trabalhador_id)
    destinatario = Destinatario(trabalhador_id, t.nome, t.matricula, t.token_acesso)
    await whatsapp.enviar(destinatario, texto.texto, _botoes(acoes or []))


def _botoes(acoes: list[str]) -> list[Botao]:
    botoes = []
    for acao in acoes:
        if acao in textos.BOTAO_DE_RESPOSTA:
            botoes.append(Botao(acao, textos.BOTAO_DE_RESPOSTA[acao]))
        elif acao in textos.BOTAO_DE_LINK:
            botoes.append(Botao(acao, textos.BOTAO_DE_LINK[acao], link=True))
    return botoes


async def do_trabalhador(sessao: AsyncSession, trabalhador_id: str, texto: str) -> None:
    await _gravar(sessao, trabalhador_id, "trabalhador", texto, None, None)


async def _gravar(
    sessao: AsyncSession, trabalhador_id: str, de: str, texto: str, acoes: list[str] | None, passo_id: str | None
) -> None:
    await sessao.execute(
        update(Mensagem)
        .where(Mensagem.trabalhador_id == trabalhador_id, Mensagem.acoes.is_not(None))
        .values(acoes=None)
    )
    sessao.add(
        Mensagem(
            id=novo_id(),
            trabalhador_id=trabalhador_id,
            de=de,
            texto=texto,
            hora=relogio.agora(),
            acoes=acoes,
            passo_id=passo_id,
        )
    )
    await sessao.flush()
