"""Porta para o WhatsApp, o canal que o SESI já usa com o trabalhador.

Duas implementações, escolhidas por `SELO_WHATSAPP`:

- `simulado` (padrão): a mensagem fica só gravada pelo módulo de comunicação e aparece na conversa da página.
- `megaapi`: além de gravar, envia de verdade pela Mega-API, para validar o fluxo num celular.

Os trabalhadores são fictícios e não têm telefone. Por isso, no modo `megaapi` toda mensagem vai para
`SELO_MEGAAPI_NUMERO_TESTE`, com um rodapé dizendo para quem seria.

Botões (docs/whatsapp.md, seções 2 e 5):
- [R] resposta → botão de resposta (`buttonMessage`), no máximo 3, com o código da ação no `id`.
  O webhook de entrada usa esse `id` para saber o que a pessoa tocou.
- [L] link → botão que abre a página pessoal (`templateMessage`) quando a mensagem só tem links;
  quando há botões de resposta junto, o link vai no texto, porque o WhatsApp não mistura os dois tipos.
Se a Mega-API recusar o botão, a mensagem sai como texto simples, com as opções escritas.
"""

import logging
from dataclasses import dataclass
from typing import Protocol

import httpx

from selo_saude.configuracao import configuracao

registro = logging.getLogger(__name__)

MAXIMO_DE_BOTOES = 3  # limite do WhatsApp no celular
MAXIMO_DO_TITULO = 20  # caracteres por botão


@dataclass(frozen=True)
class Destinatario:
    trabalhador_id: str
    nome: str
    matricula: str
    token_acesso: str


@dataclass(frozen=True)
class Botao:
    """`id` é o código da ação (ex.: "confirmar"); `link` = abre a página pessoal em vez de responder."""

    id: str
    titulo: str
    link: bool = False


class PortaWhatsApp(Protocol):
    async def enviar(self, destinatario: Destinatario, texto: str, botoes: list[Botao]) -> None: ...


class WhatsAppSimulado:
    async def enviar(self, destinatario: Destinatario, texto: str, botoes: list[Botao]) -> None:
        # Nunca registrar o texto: o log não é lugar para conversa de saúde, nem simulada.
        registro.info("WhatsApp simulado: mensagem para %s (%d botões)", destinatario.trabalhador_id, len(botoes))


# ---------------------------------------------------------------- Mega-API: montagem (funções puras)


@dataclass(frozen=True)
class Envio:
    rota: str  # "text" | "buttonMessage" | "templateMessage"
    corpo: dict


def _link(destinatario: Destinatario, url_publica: str) -> str:
    return f"{url_publica.rstrip('/')}/t/{destinatario.token_acesso}"


def _rodape(destinatario: Destinatario) -> str:
    return f"Teste Selo Saúde · para {destinatario.nome}"


def montar_envio(destinatario: Destinatario, texto: str, botoes: list[Botao], numero: str, url_publica: str) -> Envio:
    """Escolhe o tipo de mensagem pelos botões. Testada em tests/test_whatsapp_megaapi.py."""
    respostas = [b for b in botoes if not b.link][:MAXIMO_DE_BOTOES]
    links = [b for b in botoes if b.link]
    link = _link(destinatario, url_publica)
    base = {"to": numero, "footer": _rodape(destinatario), "type": "text"}

    if respostas:
        extra = f"👉 {links[0].titulo}: {link}" if links else f"Ou responda pela sua página: {link}"
        botoes_reply = [{"type": "reply", "id": b.id, "title": b.titulo[:MAXIMO_DO_TITULO]} for b in respostas]
        return Envio("buttonMessage", {**base, "text": f"{texto}\n\n{extra}", "buttons": botoes_reply})
    if links:
        botao = {"type": "url", "title": links[0].titulo[:MAXIMO_DO_TITULO], "payload": link}
        return Envio("templateMessage", {**base, "text": texto, "buttons": [botao]})
    return Envio("text", {"to": numero, "text": f"{texto}\n\n_{_rodape(destinatario)}_", "linkPreview": False})


def montar_texto_simples(
    destinatario: Destinatario, texto: str, botoes: list[Botao], numero: str, url_publica: str
) -> Envio:
    """Plano B quando o botão é recusado: as opções viram texto e o link vai junto."""
    partes = [texto]
    if botoes:
        partes.append("\n".join(f"▸ {b.titulo}" for b in botoes))
        partes.append(f"👉 Responda por aqui: {_link(destinatario, url_publica)}")
    partes.append(f"_{_rodape(destinatario)}_")
    return Envio("text", {"to": numero, "text": "\n\n".join(partes), "linkPreview": False})


# ---------------------------------------------------------------- Mega-API: envio


class WhatsAppMegaApi:
    """Envio real pela Mega-API (https://apistart01.megaapi.com.br/docs/). Falha no envio não derruba a ação:
    a mensagem já está gravada e aparece na página; o erro vai para o log."""

    def __init__(self, url: str, instancia: str, token: str, numero_teste: str, url_publica: str, apenas: list[str]):
        self._base = f"{url.rstrip('/')}/rest/sendMessage/{instancia}"
        self._cabecalhos = {"Authorization": f"Bearer {token}"}
        self._numero = numero_teste
        self._url_publica = url_publica
        self._apenas = set(apenas)

    async def enviar(self, destinatario: Destinatario, texto: str, botoes: list[Botao]) -> None:
        if self._apenas and destinatario.matricula not in self._apenas:
            registro.info("Mega-API: %s fora de SELO_MEGAAPI_APENAS, não enviado", destinatario.trabalhador_id)
            return
        envio = montar_envio(destinatario, texto, botoes, self._numero, self._url_publica)
        try:
            async with httpx.AsyncClient(timeout=10) as cliente:
                if await self._postar(cliente, envio):
                    registro.info("Mega-API: %s para %s enviada", envio.rota, destinatario.trabalhador_id)
                    return
                if envio.rota != "text":
                    registro.warning("Mega-API: %s recusada, indo como texto", envio.rota)
                    simples = montar_texto_simples(destinatario, texto, botoes, self._numero, self._url_publica)
                    if await self._postar(cliente, simples):
                        registro.info("Mega-API: texto para %s enviado", destinatario.trabalhador_id)
                        return
            registro.warning("Mega-API: não foi possível enviar para %s", destinatario.trabalhador_id)
        except httpx.HTTPError as erro:
            registro.warning("Mega-API: falha ao enviar para %s: %r", destinatario.trabalhador_id, erro)

    async def _postar(self, cliente: httpx.AsyncClient, envio: Envio) -> bool:
        resposta = await cliente.post(
            f"{self._base}/{envio.rota}", json={"messageData": envio.corpo}, headers=self._cabecalhos
        )
        if resposta.is_error:
            return False
        try:
            return not resposta.json().get("error", False)
        except ValueError:
            return True


def _criar() -> PortaWhatsApp:
    c = configuracao
    if c.whatsapp != "megaapi":
        return WhatsAppSimulado()
    obrigatorias = (
        ("INSTANCIA", c.megaapi_instancia),
        ("TOKEN", c.megaapi_token),
        ("NUMERO_TESTE", c.megaapi_numero_teste),
    )
    faltando = [nome for nome, valor in obrigatorias if not valor]
    if faltando:
        registro.warning("SELO_WHATSAPP=megaapi sem SELO_MEGAAPI_%s: usando o WhatsApp simulado", ", ".join(faltando))
        return WhatsAppSimulado()
    return WhatsAppMegaApi(
        c.megaapi_url, c.megaapi_instancia, c.megaapi_token, c.megaapi_numero_teste, c.url_publica, c.megaapi_apenas
    )


whatsapp: PortaWhatsApp = _criar()
