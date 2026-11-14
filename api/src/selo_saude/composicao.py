"""Liga os módulos uns aos outros. É o único lugar que conhece todos eles.

Os módulos não se chamam para reagir a mudanças: publicam eventos, e as assinaturas abaixo dizem quem
reage a quê. A ordem das linhas é a ordem de execução, e ela importa para a conversa ficar natural:
primeiro a resposta à ação da pessoa, depois o selo que essa ação possa ter rendido.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda.eventos import (
    CompromissoEscolhido,
    ConsultaAgendada,
    ConsultaConfirmada,
    RemarcacaoPedida,
)
from selo_saude.modulos.comunicacao import manipuladores as comunicacao
from selo_saude.modulos.monitoramento import manipuladores as monitoramento
from selo_saude.modulos.monitoramento.eventos import CheckinRespondido
from selo_saude.modulos.plano import servico as plano
from selo_saude.modulos.plano.eventos import DificuldadeRelatada, HabitoRespondido, PlanoEnviado, SeloConquistado
from selo_saude.nucleo.eventos import assinar, assinar_todos
from selo_saude.publicos import canais


async def _contar_semana_de_cuidado(sessao: AsyncSession, evento: ConsultaConfirmada | ConsultaAgendada) -> None:
    await plano.contar_semana(sessao, evento.trabalhador_id)


def compor() -> None:
    # 1. A conversa responde ao que aconteceu.
    assinar(ConsultaConfirmada, comunicacao.ao_confirmar_consulta)
    assinar(RemarcacaoPedida, comunicacao.ao_pedir_remarcacao)
    assinar(ConsultaAgendada, comunicacao.ao_agendar_consulta)
    assinar(CompromissoEscolhido, comunicacao.ao_escolher_compromisso)
    assinar(CheckinRespondido, comunicacao.ao_responder_checkin)
    assinar(HabitoRespondido, comunicacao.ao_responder_habito)
    assinar(DificuldadeRelatada, comunicacao.ao_relatar_dificuldade)
    assinar(PlanoEnviado, comunicacao.ao_enviar_plano)
    assinar(SeloConquistado, comunicacao.ao_conquistar_selo)

    # 2. Confirmar ou marcar o retorno conta como ação de cuidado da semana (e pode render um selo).
    assinar(ConsultaConfirmada, _contar_semana_de_cuidado)
    assinar(ConsultaAgendada, _contar_semana_de_cuidado)

    # 3. Tudo entra na linha do tempo da enfermagem e avisa as telas de quem precisa ver.
    assinar_todos(monitoramento.ao_acontecer)
    assinar_todos(canais.avisar_publicos)
