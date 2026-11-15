from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracao(BaseSettings):
    """Configuração lida de variáveis de ambiente com prefixo SELO_ (ou de um arquivo .env)."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SELO_", extra="ignore")

    url_banco: str = "postgresql://selo:selo@localhost:5433/selo_saude"
    url_banco_escuta: str = ""
    origens_permitidas: list[str] = ["http://localhost:5173"]
    modo_demonstracao: bool = True
    fuso: str = "America/Bahia"
    # Endereço do front que o celular abre: vai no link das mensagens enviadas de verdade.
    url_publica: str = "http://localhost:5173"
    # WhatsApp da equipe de saúde, para o botão "Falar com a equipe" do app (DDI + DDD + número, só dígitos).
    # Vazio: o botão só registra o pedido de contato, que aparece como "pediu ajuda" na fila da enfermagem.
    whatsapp_equipe: str = ""

    # WhatsApp: "simulado" ou "megaapi" (envio real para um número de teste; ver integracoes/whatsapp.py).
    whatsapp: str = "simulado"
    megaapi_url: str = "https://apistart01.megaapi.com.br"
    megaapi_instancia: str = ""
    megaapi_token: str = ""
    # Os trabalhadores são fictícios: toda mensagem real vai para este número (DDI + DDD + número, só dígitos).
    megaapi_numero_teste: str = ""
    # Se preenchido, só estas matrículas geram envio real (ex.: ["10234"]). Vazio = todas.
    megaapi_apenas: list[str] = []

    @property
    def url_sqlalchemy(self) -> str:
        """Mesma URL, no formato do driver assíncrono. O asyncpg chama `sslmode` de `ssl`."""
        url = self.url_banco.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url.replace("sslmode=", "ssl=")

    @property
    def url_escuta(self) -> str:
        """Conexão dedicada ao LISTEN. Precisa ser direta: poolers em modo transação descartam o LISTEN."""
        return self.url_banco_escuta or self.url_banco


configuracao = Configuracao()
