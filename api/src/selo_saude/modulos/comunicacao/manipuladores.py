"""Reações da comunicação ao que acontece nos outros módulos: cada evento vira a resposta certa na conversa."""

from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.eventos import (
    CompromissoEscolhido,
    ConsultaAgendada,
    ConsultaConfirmada,
    RemarcacaoPedida,
)
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.exames.eventos import ResultadoLiberado
from selo_saude.modulos.monitoramento.eventos import CheckinRespondido
from selo_saude.modulos.plano.eventos import DificuldadeRelatada, HabitoRespondido, PlanoEnviado, SeloConquistado
from selo_saude.modulos.plano.regras import MOTIVOS_DE_HORARIO, ROTULO_MOTIVO

from . import textos
from .servico import do_sesi, do_trabalhador
from .textos import RESPOSTA_DO_TRABALHADOR, Texto


async def ao_confirmar_consulta(sessao: AsyncSession, evento: ConsultaConfirmada) -> None:
    await do_trabalhador(sessao, evento.trabalhador_id, RESPOSTA_DO_TRABALHADOR["confirmar"])
    consulta = await agenda.obter(sessao, evento.trabalhador_id)
    if consulta:
        await do_sesi(sessao, evento.trabalhador_id, textos.confirmado(consulta))


async def ao_pedir_remarcacao(sessao: AsyncSession, evento: RemarcacaoPedida) -> None:
    await do_trabalhador(sessao, evento.trabalhador_id, RESPOSTA_DO_TRABALHADOR["remarcar"])
    await do_sesi(sessao, evento.trabalhador_id, textos.REMARCACAO)


async def ao_agendar_consulta(sessao: AsyncSession, evento: ConsultaAgendada) -> None:
    consulta = await agenda.obter(sessao, evento.trabalhador_id)
    if consulta:
        await do_sesi(sessao, evento.trabalhador_id, textos.agendado(consulta))
        await do_sesi(sessao, evento.trabalhador_id, textos.confirmado(consulta))


async def ao_escolher_compromisso(sessao: AsyncSession, evento: CompromissoEscolhido) -> None:
    await do_trabalhador(sessao, evento.trabalhador_id, RESPOSTA_DO_TRABALHADOR[evento.opcao])
    consulta = await agenda.obter(sessao, evento.trabalhador_id)
    if consulta:
        await do_sesi(sessao, evento.trabalhador_id, textos.compromisso(consulta, evento.opcao))


async def ao_responder_checkin(sessao: AsyncSession, evento: CheckinRespondido) -> None:
    chave = "checkin_ok" if evento.tudo_bem else "checkin_ajuda"
    await do_trabalhador(sessao, evento.trabalhador_id, RESPOSTA_DO_TRABALHADOR[chave])
    await do_sesi(
        sessao, evento.trabalhador_id, textos.CHECKIN_TUDO_BEM if evento.tudo_bem else textos.CHECKIN_PEDIU_CONTATO
    )


async def ao_responder_habito(sessao: AsyncSession, evento: HabitoRespondido) -> None:
    await do_trabalhador(
        sessao, evento.trabalhador_id, RESPOSTA_DO_TRABALHADOR["habito_sim" if evento.fez else "habito_nao"]
    )
    if evento.fez:
        await do_sesi(sessao, evento.trabalhador_id, textos.HABITO_FEITO)


async def ao_relatar_dificuldade(sessao: AsyncSession, evento: DificuldadeRelatada) -> None:
    if evento.origem == "teach_back":
        return  # nasceu de uma resposta errada na checagem, não de uma fala da pessoa
    if evento.origem == "checkin":
        await do_trabalhador(sessao, evento.trabalhador_id, ROTULO_MOTIVO[evento.motivo])
    acoes = ["escolher_horario"] if evento.motivo in MOTIVOS_DE_HORARIO else []
    await do_sesi(sessao, evento.trabalhador_id, Texto(textos.RESPOSTA_AO_MOTIVO[evento.motivo], acoes))


async def ao_enviar_plano(sessao: AsyncSession, evento: PlanoEnviado) -> None:
    trabalhador = await cadastro.obter(sessao, evento.trabalhador_id)
    await do_sesi(sessao, evento.trabalhador_id, textos.plano_pronto(trabalhador))


async def ao_liberar_resultado(sessao: AsyncSession, evento: ResultadoLiberado) -> None:
    trabalhador = await cadastro.obter(sessao, evento.trabalhador_id)
    await do_sesi(sessao, evento.trabalhador_id, textos.resultado_liberado(trabalhador))


async def ao_conquistar_selo(sessao: AsyncSession, evento: SeloConquistado) -> None:
    await do_sesi(
        sessao, evento.trabalhador_id, textos.selo(evento.nome, evento.emoji, evento.semanas), manter_botoes=True
    )
