from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracao(BaseSettings):
    """Configuração lida de variáveis de ambiente com prefixo SELO_ (ou de um arquivo .env)."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SELO_", extra="ignore")

    url_banco: str = "postgresql://selo:selo@localhost:5433/selo_saude"
    url_banco_escuta: str = ""
    origens_permitidas: list[str] = ["http://localhost:5173"]
    modo_demonstracao: bool = True
    fuso: str = "America/Bahia"

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
