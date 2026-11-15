"""Rotas que só existem para a apresentação. Não são registradas fora do modo de demonstração."""

import logging
import re
import time
from collections import deque
from typing import Literal

from fastapi import APIRouter, BackgroundTasks

from selo_saude.demonstracao import semente
from selo_saude.integracoes import whatsapp
from selo_saude.modulos.comunicacao import servico as comunicacao
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.monitoramento import servico as monitoramento
from selo_saude.nucleo.banco import Sessao, fabrica_de_sessoes
from selo_saude.nucleo.erros import RegraViolada
from selo_saude.nucleo.esquema import Esquema
from selo_saude.nucleo.tempo_real import TUDO, avisar, transacional

from . import canais

rota = APIRouter(prefix="/api/demonstracao", tags=["Demonstração"])
registro = logging.getLogger(__name__)

# ---------------------------------------------------------------- "Testar no meu WhatsApp"
# O avaliador digita o próprio número no painel e recebe, de verdade, uma mensagem do sistema como se fosse o
# Marcos (a persona). A ação acontece no sistema (histórico, último contato), só o destino muda.
# O número não é gravado em lugar nenhum e aparece mascarado no log.

PERSONA = "t1"
MensagemDeTeste = Literal["lembrete", "como_voce_esta", "pergunta_da_semana", "link_pessoal"]
_ENVIAR = {
    "lembrete": comunicacao.enviar_lembrete,
    "como_voce_esta": comunicacao.enviar_checkin,
    "pergunta_da_semana": comunicacao.enviar_checkin_habito,
    "link_pessoal": comunicacao.enviar_link_pessoal,
}
# Limite de envios, para o botão não virar disparo em massa: por número e no total, em 10 minutos.
# Só existe na demonstração e numa instância; não é estado de negócio.
_JANELA = 600
_POR_NUMERO = 5
_NO_TOTAL = 40
_envios_recentes: deque[tuple[float, str]] = deque()


class PedidoDeTeste(Esquema):
    numero: str
    """WhatsApp com DDD, com ou sem o 55 do Brasil e com ou sem pontuação."""
    mensagem: MensagemDeTeste


class ResultadoDoTeste(Esquema):
    envio_real: bool
    """False quando o WhatsApp real está desligado na API: a mensagem só aparece no celular simulado."""
    enviado: bool
    numero_mascarado: str


class SituacaoDoWhatsApp(Esquema):
    envio_real: bool


def normalizar_numero(texto: str) -> str:
    """Celular brasileiro no formato da API: 55 + DDD + número (12 ou 13 dígitos)."""
    digitos = re.sub(r"\D", "", texto)
    if texto.strip().startswith("+") and not digitos.startswith("55"):
        raise RegraViolada("Use um número do Brasil (+55).")
    if len(digitos) in (10, 11):
        digitos = "55" + digitos
    if not (digitos.startswith("55") and len(digitos) in (12, 13)):
        raise RegraViolada("Número inválido. Use DDD + número, por exemplo (71) 99999-8888.")
    return digitos


def mascarar(numero: str) -> str:
    return f"+{numero[:2]} ({numero[2:4]}) •••••-{numero[-4:]}"


def _respeita_o_limite(numero: str) -> None:
    agora = time.monotonic()
    while _envios_recentes and agora - _envios_recentes[0][0] > _JANELA:
        _envios_recentes.popleft()
    if len(_envios_recentes) >= _NO_TOTAL or sum(n == numero for _, n in _envios_recentes) >= _POR_NUMERO:
        raise RegraViolada("Muitos envios de teste em pouco tempo. Tente de novo em alguns minutos.")
    _envios_recentes.append((agora, numero))


@rota.get("/whatsapp")
async def situacao_do_whatsapp() -> SituacaoDoWhatsApp:
    return SituacaoDoWhatsApp(envio_real=whatsapp.envio_real_ligado())


@rota.post("/whatsapp/teste")
@transacional
async def testar_no_meu_whatsapp(corpo: PedidoDeTeste, sessao: Sessao) -> ResultadoDoTeste:
    """Manda ao número informado a mensagem escolhida, como se fosse para o Marcos."""
    numero = normalizar_numero(corpo.numero)
    _respeita_o_limite(numero)
    marca = whatsapp.destino_do_teste.set(numero)
    whatsapp.resultado_do_envio.set(None)
    try:
        await _ENVIAR[corpo.mensagem](sessao, PERSONA)
        enviado = whatsapp.resultado_do_envio.get()
    finally:
        whatsapp.destino_do_teste.reset(marca)
    registro.info("Teste no WhatsApp: %s para %s", corpo.mensagem, mascarar(numero))
    real = whatsapp.envio_real_ligado()
    return ResultadoDoTeste(envio_real=real, enviado=bool(enviado) if real else True, numero_mascarado=mascarar(numero))


async def _aquecer_carteira() -> None:
    async with fabrica_de_sessoes() as sessao:
        await monitoramento.aquecer(sessao)


@rota.post("/reinicio", status_code=204)
@transacional
async def reiniciar(sessao: Sessao, depois: BackgroundTasks) -> None:
    """Apaga tudo e recria os dados fictícios, com as datas relativas a hoje. Depois de responder, já calcula
    a carteira da APS de novo, para o painel não esperar."""
    depois.add_task(_aquecer_carteira)
    await semente.reiniciar(sessao)
    avisar(sessao, TUDO, canais.APS, canais.LIDERANCA, canais.RH)
    avisar(sessao, *(canais.do_trabalhador(f"t{n + 1}") for n in range(len(semente.PESSOAS))))
    avisar(sessao, *(canais.do_totem(u.unidade) for u in await indicadores.unidades_com_totem(sessao)))
