"""Reações do monitoramento: cada evento dos outros módulos vira um registro na linha do tempo do cuidado."""

from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda.eventos import (
    CompromissoEscolhido,
    ConsultaAgendada,
    ConsultaConfirmada,
    LembreteAutomaticoRegistrado,
    RemarcacaoPedida,
)
from selo_saude.modulos.cadastro.eventos import TurnoAtualizado
from selo_saude.modulos.comunicacao.eventos import CheckinEnviado, CheckinHabitoEnviado, LembreteEnviado
from selo_saude.modulos.exames.eventos import ExameColetado, ResultadoLiberado, ResultadoVisto
from selo_saude.modulos.plano.eventos import (
    DificuldadeRelatada,
    DificuldadeResolvida,
    HabitoRespondido,
    PassoFeito,
    PlanoEnviado,
    PlanoRecebido,
    SeloConquistado,
    TeachBackRespondido,
)
from selo_saude.modulos.plano.regras import ROTULO_MOTIVO
from selo_saude.nucleo.eventos import EventoDominio
from selo_saude.nucleo.relogio import dia_semana, hora_curta

from .eventos import CheckinRespondido
from .regras import NOTA_CHECKIN_HABITO_ENVIADO
from .servico import anotar, marcar_contato


def _registro(evento: EventoDominio) -> tuple[str, str | None] | None:
    """Tipo e nota do registro que o evento gera, ou None se ele não entra na linha do tempo."""
    match evento:
        case ConsultaConfirmada():
            return "confirmou", None
        case RemarcacaoPedida():
            return "pediu_remarcar", None
        case ConsultaAgendada(inicio=inicio, modalidade=modalidade):
            return "agendou", f"{dia_semana(inicio)}, {hora_curta(inicio)} · {modalidade}"
        case CompromissoEscolhido():
            return "compromisso", None
        case LembreteAutomaticoRegistrado(qual=qual):
            return "lembrete_auto", qual
        case TurnoAtualizado(turno=turno):
            return "turno_atualizado", turno
        case LembreteEnviado():
            return "lembrete", None
        case CheckinHabitoEnviado():
            return "checkin_habito", NOTA_CHECKIN_HABITO_ENVIADO
        case CheckinEnviado():
            return "checkin_enviado", None
        case PlanoEnviado():
            return "plano_enviado", None
        case PlanoRecebido():
            return "plano_recebido", None
        case PassoFeito(titulo=titulo):
            return "passo_feito", titulo
        case HabitoRespondido(fez=fez):
            return ("passo_feito" if fez else "checkin_habito"), None
        case DificuldadeRelatada(motivo=motivo, origem=origem) if origem != "teach_back":
            return "dificuldade", ROTULO_MOTIVO[motivo]
        case DificuldadeResolvida(motivo=motivo, nota=nota):
            return "dificuldade_resolvida", ROTULO_MOTIVO[motivo] + (f" — {nota}" if nota else "")
        case TeachBackRespondido(acertou=acertou):
            return "teach_back", f"{'acertou' if acertou else 'errou'} a pergunta de checagem"
        case SeloConquistado(nome=nome, emoji=emoji):
            return "selo", f"{emoji} {nome}"
        case ExameColetado(titulo=titulo):
            return "exame_coletado", titulo
        case ResultadoLiberado(titulo=titulo):
            return "resultado_liberado", titulo
        case ResultadoVisto():
            return "resultado_visto", None
        case CheckinRespondido(tudo_bem=tudo_bem):
            return ("checkin_ok" if tudo_bem else "checkin_ajuda"), None
    return None


async def ao_acontecer(sessao: AsyncSession, evento: EventoDominio) -> None:
    registro = _registro(evento)
    if registro is None:
        return
    tipo, nota = registro
    await anotar(sessao, evento.trabalhador_id, tipo, nota)  # type: ignore[attr-defined]
    if isinstance(evento, DificuldadeResolvida):
        # Resolver uma dificuldade é um contato da enfermagem com a pessoa.
        await marcar_contato(sessao, evento.trabalhador_id)
