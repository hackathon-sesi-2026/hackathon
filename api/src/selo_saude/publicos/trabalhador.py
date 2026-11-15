"""Rotas do celular do trabalhador. O token do link pessoal é a credencial: só dá acesso aos dados daquela pessoa.

Nada aqui devolve risco, histórico da enfermagem ou risco de falta: isso é da equipe de saúde.
"""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from selo_saude.configuracao import configuracao
from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.regras import Horario, Modalidade
from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.beneficios import servico as beneficios
from selo_saude.modulos.beneficios.servico import MeusBeneficios
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.cadastro.servico import TURNOS, DadosTrabalhador, Motivacao, Turno
from selo_saude.modulos.comunicacao import servico as comunicacao
from selo_saude.modulos.comunicacao.servico import DadosMensagem
from selo_saude.modulos.exames import servico as exames
from selo_saude.modulos.exames.servico import DadosExame
from selo_saude.modulos.monitoramento import servico as monitoramento
from selo_saude.modulos.plano import servico as plano
from selo_saude.modulos.plano.regras import Motivo, Selo
from selo_saude.modulos.plano.servico import DadosPasso
from selo_saude.nucleo.banco import Sessao
from selo_saude.nucleo.esquema import Esquema
from selo_saude.nucleo.tempo_real import avisar, resposta_sse, transacional

from . import canais

rota = APIRouter(prefix="/api/trabalhador/{token}", tags=["Celular do trabalhador"])


async def _trabalhador_do_link(token: str, sessao: Sessao) -> DadosTrabalhador:
    return await cadastro.obter_por_token(sessao, token)


Eu = Annotated[DadosTrabalhador, Depends(_trabalhador_do_link)]


def _passos_feitos(passos: list[DadosPasso]) -> int:
    return sum(1 for p in passos if p.feito)


class MinhaDificuldade(Esquema):
    """A pessoa vê que avisou e sobre qual passo. A nota da enfermagem não aparece para ela."""

    id: str
    motivo: Motivo
    passo_id: str | None
    resolvida: bool


class MeuCuidado(Esquema):
    id: str
    nome: str
    enfermeira: str
    unidade: str
    motivacao: Motivacao | None
    turno: Turno
    consulta: DadosConsulta | None
    status_plano: Literal["nao_enviado", "enviado", "recebido"]
    semanas_seguidas: int
    selos: list[Selo]
    passos: list[DadosPasso]
    dificuldades: list[MinhaDificuldade]
    checagem: list[str] | None
    """Opções da pergunta "qual é o seu primeiro passo?", enquanto ela estiver pendente."""
    exames: list[DadosExame]
    resultado_nao_visto: bool
    """Há resultado novo que a pessoa ainda não abriu."""
    mensagens: list[DadosMensagem]
    beneficios: MeusBeneficios
    contato_equipe: str | None
    """WhatsApp da equipe de saúde (só dígitos), quando configurado."""


class HorariosDisponiveis(Esquema):
    turnos: list[Turno]
    horarios: list[Horario]


class Agendamento(Esquema):
    inicio: datetime
    modalidade: Modalidade
    nome_para_lideranca: bool = False


class EscolhaDeCompromisso(Esquema):
    opcao: Literal["se_turno", "se_folga", "se_so_lembrete"]


class TrocaDeTurno(Esquema):
    nome: str


class EscolhaDeMotivacao(Esquema):
    motivacao: Motivacao


class MarcacaoDePasso(Esquema):
    feito: bool


class RespostaDeHabito(Esquema):
    fez: bool


class RelatoDeDificuldade(Esquema):
    motivo: Motivo
    origem: Literal["plano", "checkin"]
    passo_id: str | None = None


class RespostaDaChecagem(Esquema):
    resposta: str


class RespostaDoCheckin(Esquema):
    tudo_bem: bool


@rota.get("")
async def meu_cuidado(eu: Eu, sessao: Sessao) -> MeuCuidado:
    meu_plano = await plano.obter(sessao, eu.id)
    meus_exames = await exames.listar(sessao, eu.id)
    return MeuCuidado(
        id=eu.id,
        nome=eu.nome,
        enfermeira=eu.enfermeira,
        unidade=eu.unidade,
        motivacao=eu.motivacao,
        turno=eu.turno,
        consulta=await agenda.obter(sessao, eu.id),
        status_plano=meu_plano.status,
        semanas_seguidas=meu_plano.semanas_seguidas,
        selos=meu_plano.selos,
        passos=meu_plano.passos,
        dificuldades=[MinhaDificuldade.model_validate(d) for d in meu_plano.dificuldades],
        checagem=meu_plano.opcoes_da_checagem(eu.id),
        exames=meus_exames,
        resultado_nao_visto=any(not e.resultado_visto for e in meus_exames),
        mensagens=await comunicacao.listar(sessao, eu.id),
        beneficios=await beneficios.resumo(sessao, eu.id, _passos_feitos(meu_plano.passos), meu_plano.semanas_seguidas),
        contato_equipe=configuracao.whatsapp_equipe or None,
    )


@rota.get("/eventos")
async def eventos(eu: Eu) -> StreamingResponse:
    return resposta_sse(canais.do_trabalhador(eu.id))


@rota.get("/horarios")
async def horarios(eu: Eu) -> HorariosDisponiveis:
    return HorariosDisponiveis(turnos=TURNOS, horarios=agenda.listar_horarios(eu))


@rota.post("/consulta/confirmacao", status_code=204)
@transacional
async def confirmar_consulta(eu: Eu, sessao: Sessao) -> None:
    await agenda.confirmar(sessao, eu.id)


@rota.post("/consulta/remarcacao", status_code=204)
@transacional
async def pedir_remarcacao(eu: Eu, sessao: Sessao) -> None:
    await agenda.pedir_remarcacao(sessao, eu.id)


@rota.post("/consulta", status_code=204)
@transacional
async def agendar(eu: Eu, corpo: Agendamento, sessao: Sessao) -> None:
    await agenda.agendar(sessao, eu, corpo.inicio, corpo.modalidade, corpo.nome_para_lideranca)


@rota.post("/consulta/compromisso", status_code=204)
@transacional
async def escolher_compromisso(eu: Eu, corpo: EscolhaDeCompromisso, sessao: Sessao) -> None:
    await agenda.escolher_compromisso(sessao, eu.id, corpo.opcao)


@rota.put("/turno", status_code=204)
@transacional
async def atualizar_turno(eu: Eu, corpo: TrocaDeTurno, sessao: Sessao) -> None:
    await cadastro.atualizar_turno(sessao, eu.id, corpo.nome)


@rota.put("/motivacao", status_code=204)
@transacional
async def definir_motivacao(eu: Eu, corpo: EscolhaDeMotivacao, sessao: Sessao) -> None:
    await cadastro.definir_motivacao(sessao, eu.id, corpo.motivacao)


@rota.post("/plano/abertura", status_code=204)
@transacional
async def abrir_plano(eu: Eu, sessao: Sessao) -> None:
    await plano.abrir(sessao, eu.id)


@rota.put("/plano/passos/{passo_id}", status_code=204)
@transacional
async def marcar_passo(eu: Eu, passo_id: str, corpo: MarcacaoDePasso, sessao: Sessao) -> None:
    await plano.marcar_passo(sessao, eu.id, passo_id, corpo.feito)


@rota.post("/plano/passos/{passo_id}/habito", status_code=204)
@transacional
async def responder_habito(eu: Eu, passo_id: str, corpo: RespostaDeHabito, sessao: Sessao) -> None:
    await plano.responder_habito(sessao, eu.id, passo_id, corpo.fez)


@rota.post("/plano/dificuldades", status_code=204)
@transacional
async def relatar_dificuldade(eu: Eu, corpo: RelatoDeDificuldade, sessao: Sessao) -> None:
    await plano.relatar_dificuldade(sessao, eu.id, corpo.motivo, corpo.origem, corpo.passo_id)


@rota.post("/plano/checagem", status_code=204)
@transacional
async def responder_checagem(eu: Eu, corpo: RespostaDaChecagem, sessao: Sessao) -> None:
    await plano.responder_checagem(sessao, eu.id, corpo.resposta)


@rota.post("/exames/visualizacao", status_code=204)
@transacional
async def ver_resultados(eu: Eu, sessao: Sessao) -> None:
    await exames.ver_resultados(sessao, eu.id)


@rota.post("/beneficios/{beneficio_id}/resgate", status_code=204)
@transacional
async def resgatar_beneficio(eu: Eu, beneficio_id: str, sessao: Sessao) -> None:
    meu_plano = await plano.obter(sessao, eu.id)
    await beneficios.resgatar(sessao, eu.id, beneficio_id, _passos_feitos(meu_plano.passos), meu_plano.semanas_seguidas)
    avisar(sessao, canais.do_trabalhador(eu.id))  # a tela do celular busca o saldo e o código de novo


@rota.post("/checkin", status_code=204)
@transacional
async def responder_checkin(eu: Eu, corpo: RespostaDoCheckin, sessao: Sessao) -> None:
    await monitoramento.responder_checkin(sessao, eu.id, corpo.tudo_bem)
