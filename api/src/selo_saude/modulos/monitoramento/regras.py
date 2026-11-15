"""Regras puras do monitoramento: em que situação a pessoa está e qual o risco de ela sair do cuidado.

Usam só risco, datas e dados de participação. Nada clínico entra aqui, e nenhuma decisão é automática:
as regras ordenam a fila e sugerem a próxima ação, e quem decide é a enfermagem.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.cadastro.servico import DadosTrabalhador
from selo_saude.modulos.plano.regras import ROTULO_MOTIVO
from selo_saude.modulos.plano.servico import DadosPlano
from selo_saude.nucleo.esquema import Esquema, Instante
from selo_saude.nucleo.relogio import dias_entre, inicio_do_dia

# Prazo de retorno por classe de risco (fluxo da APS). Risco 4 é critério médico; a demo usa 30 dias.
PRAZO_EM_DIAS = {1: 180, 2: 180, 3: 90, 4: 30}

# Tipos de registro que contam como resposta do trabalhador a um lembrete.
_RESPOSTAS = {"confirmou", "pediu_remarcar", "agendou", "checkin_ok", "checkin_ajuda", "dificuldade"}

CodigoSituacao = Literal[
    "dificuldade",
    "pediu_ajuda",
    "faltou",
    "remarcar",
    "fora_do_prazo",
    "plano_nao_recebido",
    "sem_resposta",
    "vence_logo",
    "em_contato",
    "em_dia",
]

ROTULO_SITUACAO: dict[str, str] = {
    "dificuldade": "Relatou dificuldade",
    "pediu_ajuda": "Pediu contato",
    "faltou": "Faltou",
    "remarcar": "Pediu remarcação",
    "fora_do_prazo": "Fora do prazo",
    "plano_nao_recebido": "Plano não recebido",
    "sem_resposta": "Sem resposta",
    "vence_logo": "Prazo vence logo",
    "em_contato": "Em contato",
    "em_dia": "Em dia",
}


class RegistroHistorico(Esquema):
    id: str
    tipo: str
    data: Instante
    nota: str | None


@dataclass(frozen=True)
class Retrato:
    """Tudo o que as regras precisam saber de uma pessoa, reunido dos outros módulos."""

    trabalhador: DadosTrabalhador
    consulta: DadosConsulta | None
    plano: DadosPlano
    historico: list[RegistroHistorico]
    ultimo_contato_enfermagem: datetime | None
    pediu_contato: bool


class Situacao(Esquema):
    codigo: CodigoSituacao
    rotulo: str
    detalhe: str
    prioridade: int
    """Menor = mais urgente."""
    precisa_acao: bool
    sugestao: str
    """Próxima ação sugerida à enfermagem."""


class RiscoFalta(Esquema):
    pontos: int
    nivel: Literal["alto", "medio", "baixo"]
    motivos: list[str]


def prazo_retorno(trabalhador: DadosTrabalhador) -> datetime:
    return trabalhador.ultima_consulta_medica + timedelta(days=PRAZO_EM_DIAS[trabalhador.risco])


def lembrete_sem_resposta(historico: list[RegistroHistorico], hoje: datetime) -> bool:
    """O último lembrete manual foi enviado há 3 dias ou mais e a pessoa não reagiu depois dele."""
    lembrete = next((r for r in reversed(historico) if r.tipo == "lembrete"), None)
    if lembrete is None:
        return False
    respondeu = any(r.data > lembrete.data and r.tipo in _RESPOSTAS for r in historico)
    return not respondeu and dias_entre(lembrete.data, hoje) >= 3


def risco_falta(r: Retrato, hoje: datetime) -> RiscoFalta:
    """Pontuação simples e auditável de quem tende a faltar. Cada ponto vem com o motivo escrito.

    Evidência: modelo de risco mais contato humano dirigido reduz faltas (Oikonomidi et al., JAMIA 2023).
    Os pesos são hipótese do time, a calibrar com o histórico do S+ no piloto.
    """
    t, c = r.trabalhador, r.consulta
    abertas = r.plano.dificuldades_abertas
    de_horario = {"tempo", "transporte"}
    fatores: list[tuple[bool, int, str]] = [
        (t.faltas_ultimo_ano >= 2, 30, f"{t.faltas_ultimo_ano} faltas no último ano"),
        (t.faltas_ultimo_ano == 1, 15, "1 falta no último ano"),
        (c is not None and c.status == "faltou", 15, "faltou ao último retorno"),
        (any(d.motivo in de_horario for d in abertas), 20, "relatou falta de tempo ou transporte"),
        (any(d.motivo not in de_horario for d in abertas), 10, "tem dificuldade aberta no plano"),
        (r.plano.teach_back == "errou", 10, "pode não ter entendido o plano"),
        (r.plano.status != "recebido", 10, "não abriu o plano de cuidado"),
        (lembrete_sem_resposta(r.historico, hoje), 15, "lembrete sem resposta há 3+ dias"),
        (c is not None and c.status == "agendada", 5, "retorno ainda não confirmado"),
        (t.turno.noturno, 10, "trabalha no turno da noite"),
        (dias_entre(hoje, prazo_retorno(t)) < 0 and c is None, 10, "prazo do risco vencido"),
    ]
    ativos = [(pontos, motivo) for ativo, pontos, motivo in fatores if ativo]
    pontos = min(100, sum(p for p, _ in ativos))
    nivel = "alto" if pontos >= 45 else "medio" if pontos >= 25 else "baixo"
    return RiscoFalta(pontos=pontos, nivel=nivel, motivos=[m for _, m in ativos])


def situacao(r: Retrato, hoje: datetime) -> Situacao:
    """Situação da pessoa para a fila da enfermagem, da mais urgente para a mais tranquila."""
    t, c = r.trabalhador, r.consulta
    dias_para_o_prazo = dias_entre(hoje, prazo_retorno(t))
    consulta_futura = c is not None and c.data >= inicio_do_dia(hoje) and c.status != "faltou"
    contato_recente = r.ultimo_contato_enfermagem is not None and dias_entre(r.ultimo_contato_enfermagem, hoje) <= 7

    def s(codigo: CodigoSituacao, prioridade: int, detalhe: str, sugestao: str, precisa_acao: bool = True) -> Situacao:
        return Situacao(
            codigo=codigo,
            rotulo=ROTULO_SITUACAO[codigo],
            detalhe=detalhe,
            prioridade=prioridade,
            precisa_acao=precisa_acao,
            sugestao=sugestao,
        )

    abertas = r.plano.dificuldades_abertas
    if abertas:
        d = abertas[-1]
        passo = next((p.titulo for p in r.plano.passos if p.id == d.passo_id), None)
        return s("dificuldade", 0, ROTULO_MOTIVO[d.motivo] + (f" · {passo}" if passo else ""), d.acao_sugerida)
    if r.pediu_contato:
        return s(
            "pediu_ajuda",
            0,
            "Pediu para falar com a enfermeira no check-in",
            "Ligar ou responder no WhatsApp em até 2 dias úteis",
        )
    if c is not None and c.status == "remarcar":
        return s("remarcar", 1, "Não pode ir na data marcada", "Aguardar a escolha pelo link ou oferecer horário")
    if c is not None and c.status == "faltou" and not contato_recente:
        return s(
            "faltou", 1, f"Faltou ao retorno há {dias_entre(c.data, hoje)} dia(s)", "Entrar em contato e reagendar"
        )
    if not consulta_futura and dias_para_o_prazo < 0 and not contato_recente:
        return s(
            "fora_do_prazo",
            2,
            f"{-dias_para_o_prazo} dia(s) além do prazo do risco",
            "Convocar para retorno (enviar lembrete)",
        )

    envio = r.plano.data_envio
    if r.plano.status == "enviado" and envio is not None and dias_entre(envio, hoje) >= 3:
        return s(
            "plano_nao_recebido",
            3,
            f"Plano enviado há {dias_entre(envio, hoje)} dias e ainda não aberto",
            "Reenviar o plano ou confirmar o número",
        )
    if r.plano.status == "nao_enviado":
        return s("plano_nao_recebido", 3, "Plano de cuidado ainda não enviado", "Enviar o plano pelo WhatsApp")

    if lembrete_sem_resposta(r.historico, hoje):
        return s("sem_resposta", 3, "Lembrete sem resposta há 3 dias ou mais", "Tentar contato por telefone")

    if contato_recente:
        return s("em_contato", 5, "Enfermagem fez contato nos últimos 7 dias", "Aguardar retorno do trabalhador", False)
    if not consulta_futura and dias_para_o_prazo <= 15:
        return s(
            "vence_logo",
            4,
            f"Prazo vence em {dias_para_o_prazo} dia(s), sem retorno marcado",
            "Enviar lembrete para agendar",
        )

    if consulta_futura and c is not None:
        detalhe = f"Retorno {'confirmado' if c.status == 'confirmada' else 'agendado'}"
    else:
        detalhe = f"Próximo retorno em até {dias_para_o_prazo} dia(s)"
    return s("em_dia", 6, detalhe, "Nenhuma ação agora", False)


# ---------------------------------------------------------------- cadência das mensagens (o agendador)

NOTA_CHECKIN_HABITO_ENVIADO = "check-in enviado"

MensagemDaCadencia = Literal["lembrete_d1", "lembrete_d3", "convite_retorno", "como_voce_esta", "pergunta_da_semana"]

ROTULO_CADENCIA: dict[str, str] = {
    "lembrete_d1": "Lembrete 1 dia antes do retorno",
    "lembrete_d3": "Lembrete 3 dias antes do retorno",
    "convite_retorno": "Convite para marcar o retorno",
    "como_voce_esta": "Como você está",
    "pergunta_da_semana": "Pergunta da semana sobre o plano",
}

DIAS_DE_ANTECEDENCIA_DO_CONVITE = 30
"""O convite para marcar o retorno sai quando faltam 30 dias ou menos para o prazo do risco."""


def _envio_ativo(r: RegistroHistorico) -> bool:
    """Mensagem que o SESI enviou por iniciativa própria (não uma resposta a um toque da pessoa)."""
    if r.tipo == "checkin_habito":
        return r.nota == NOTA_CHECKIN_HABITO_ENVIADO
    return r.tipo in {"lembrete", "lembrete_auto", "checkin_enviado", "plano_enviado", "resultado_liberado"}


def _enviado_ha_menos_de(historico: list[RegistroHistorico], hoje: datetime, dias: int, tipo: str) -> bool:
    return any(_envio_ativo(r) and r.tipo == tipo and 0 <= dias_entre(r.data, hoje) < dias for r in historico)


def mensagem_do_dia(r: Retrato, proximo_monitoramento: datetime, hoje: datetime) -> MensagemDaCadencia | None:
    """Qual mensagem o agendador manda hoje para a pessoa, ou nenhuma. No máximo uma por dia.

    Limites, para não virar cobrança (docs/whatsapp.md, seção 4):
    - se a enfermagem está tratando (dificuldade aberta, pediu contato, faltou), o agendador não fala: é a vez dela;
    - se o SESI já mandou alguma mensagem hoje, espera o dia seguinte;
    - o convite para marcar o retorno não se repete em 30 dias. Sem resposta, a pessoa entra na fila da APS.
    A ordem abaixo é a prioridade: o retorno marcado vem primeiro.
    """
    c = r.consulta
    if r.plano.dificuldades_abertas or r.pediu_contato or (c is not None and c.status == "faltou"):
        return None
    if any(_envio_ativo(h) and dias_entre(h.data, hoje) == 0 for h in r.historico):
        return None

    marcada = c is not None and c.status in ("agendada", "confirmada") and dias_entre(hoje, c.data) >= 1
    if marcada and c is not None:
        dias = dias_entre(hoje, c.data)
        if dias == 1 and "D-1" not in c.lembretes_automaticos:
            return "lembrete_d1"
        if 2 <= dias <= 3 and not {"D-3", "D-1"} & set(c.lembretes_automaticos):
            return "lembrete_d3"
    elif c is None or c.status != "remarcar":
        perto_do_prazo = dias_entre(hoje, prazo_retorno(r.trabalhador)) <= DIAS_DE_ANTECEDENCIA_DO_CONVITE
        if perto_do_prazo and not _enviado_ha_menos_de(r.historico, hoje, 30, "lembrete"):
            return "convite_retorno"

    if dias_entre(proximo_monitoramento, hoje) >= 0 and not _enviado_ha_menos_de(
        r.historico, hoje, 7, "checkin_enviado"
    ):
        return "como_voce_esta"

    if (
        r.plano.status == "recebido"
        and r.plano.proximo_passo is not None
        and not _enviado_ha_menos_de(r.historico, hoje, 7, "checkin_habito")
    ):
        return "pergunta_da_semana"
    return None


# ---------------------------------------------------------------- doença crônica e engajamento

DoencaCronica = Literal["nao", "compensada", "descompensada"]


def doenca_cronica(risco: int) -> DoencaCronica:
    """Lida da classificação de risco do SESI, sem diagnóstico: risco 3 é doença crônica compensada,
    risco 4 é descompensada. Riscos 1 e 2 são saudáveis (o 2 tem fatores de risco, sem doença)."""
    return "descompensada" if risco == 4 else "compensada" if risco == 3 else "nao"


class ItemDoEngajamento(Esquema):
    rotulo: str
    como_esta: str
    """Em palavras: "1 de 4", "Confirmado", "Não". (Não se chama `valor`: na fila da APS esse nome é do exame.)"""
    pontos: int
    maximo: int


class Engajamento(Esquema):
    """Participação da pessoa no programa, de 0 a 100. É uso do canal e da agenda, não adesão ao tratamento:
    adesão quem verifica é a equipe de saúde na consulta."""

    pontos: int
    nivel: Literal["alto", "medio", "baixo"]
    itens: list[ItemDoEngajamento]


def engajamento(r: Retrato, hoje: datetime) -> Engajamento:
    """Quatro partes de 25 pontos, cada uma com o porquê. Os pesos são hipótese do time."""
    passos = r.plano.passos
    feitos = sum(1 for p in passos if p.feito)
    c = r.consulta
    respondeu = any(x.tipo in _RESPOSTAS and dias_entre(x.data, hoje) <= 30 for x in r.historico)

    if c is None:
        retorno, pontos_retorno = "Não marcado", 0
    elif c.status == "confirmada":
        retorno, pontos_retorno = "Confirmado", 25
    elif c.status == "faltou":
        retorno, pontos_retorno = "Faltou", 0
    else:
        retorno, pontos_retorno = "Marcado, sem confirmar", 10

    itens = [
        ItemDoEngajamento(
            rotulo="Abriu o plano de cuidado",
            como_esta="Sim" if r.plano.status == "recebido" else "Não",
            pontos=25 if r.plano.status == "recebido" else 0,
            maximo=25,
        ),
        ItemDoEngajamento(
            rotulo="Passos do plano feitos",
            como_esta=f"{feitos} de {len(passos)}",
            pontos=round(25 * feitos / len(passos)) if passos else 0,
            maximo=25,
        ),
        ItemDoEngajamento(rotulo="Retorno", como_esta=retorno, pontos=pontos_retorno, maximo=25),
        ItemDoEngajamento(
            rotulo="Responde às mensagens",
            como_esta="Respondeu nos últimos 30 dias" if respondeu else "Sem resposta há 30 dias",
            pontos=25 if respondeu else 0,
            maximo=25,
        ),
    ]
    pontos = sum(i.pontos for i in itens)
    return Engajamento(
        pontos=pontos, nivel="alto" if pontos >= 70 else "medio" if pontos >= 40 else "baixo", itens=itens
    )
