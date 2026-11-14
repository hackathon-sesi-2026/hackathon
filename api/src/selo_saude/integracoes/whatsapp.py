"""Porta para o WhatsApp, o canal que o SESI já usa com o trabalhador.

O envio real (API oficial ou o chatbot em implantação) entra aqui. No hackathon o envio é simulado:
a mensagem fica gravada pelo módulo de comunicação e aparece na conversa da página do trabalhador.
"""

import logging
from typing import Protocol

registro = logging.getLogger(__name__)


class PortaWhatsApp(Protocol):
    async def enviar(self, trabalhador_id: str, texto: str, botoes: list[str]) -> None: ...


class WhatsAppSimulado:
    async def enviar(self, trabalhador_id: str, texto: str, botoes: list[str]) -> None:
        # Nunca registrar o texto: o log não é lugar para conversa de saúde, nem simulada.
        registro.info("WhatsApp simulado: mensagem para %s (%d botões)", trabalhador_id, len(botoes))


whatsapp: PortaWhatsApp = WhatsAppSimulado()
