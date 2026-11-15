"""Base da suíte de QA: fala com o sistema de pé, como um usuário faria, pelo front (que repassa /api).

Cada teste começa do zero: os dados fictícios são recriados antes dele. Por isso a suíte apaga qualquer
estado de demonstração que esteja na tela.

Marcadores:
- `regra("N")`: o teste verifica a regra N de "Regras que não se negociam" em docs/produto.md.
- `critico`: se falhar, o veredito é REPROVADO. Sem ele, a falha vira ressalva.
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import pytest

URL_WEB = os.environ.get("QA_URL_WEB", "http://localhost:5173").rstrip("/")
URL_API = f"{URL_WEB}/api"
ARQUIVO_RESULTADO = Path(os.environ.get("QA_RESULTADO", Path(__file__).parent / ".resultado.json"))


class Api:
    def pedir(self, metodo: str, caminho: str, corpo: object | None = None) -> tuple[int, object]:
        requisicao = urllib.request.Request(
            URL_API + caminho,
            method=metodo,
            data=json.dumps(corpo).encode() if corpo is not None else None,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(requisicao, timeout=15) as resposta:
                texto = resposta.read().decode()
                return resposta.status, json.loads(texto) if texto else None
        except urllib.error.HTTPError as erro:
            return erro.code, erro.read().decode()

    def get(self, caminho: str):
        status, dados = self.pedir("GET", caminho)
        assert status == 200, f"GET {caminho} -> {status}: {dados}"
        return dados

    def post(self, caminho: str, corpo: object | None = None) -> int:
        return self.pedir("POST", caminho, corpo)[0]

    def put(self, caminho: str, corpo: object | None = None) -> int:
        return self.pedir("PUT", caminho, corpo)[0]

    # ---- atalhos do domínio

    def fila(self) -> list[dict]:
        return self.get("/aps/fila")

    def linha(self, trabalhador_id: str) -> dict:
        return next(linha for linha in self.fila() if linha["trabalhador"]["id"] == trabalhador_id)

    def token(self, trabalhador_id: str) -> str:
        return self.linha(trabalhador_id)["trabalhador"]["tokenAcesso"]

    def celular(self, trabalhador_id: str) -> dict:
        return self.get(f"/trabalhador/{self.token(trabalhador_id)}")


@pytest.fixture(scope="session")
def api() -> Api:
    return Api()


@pytest.fixture(autouse=True)
def dados_limpos(api: Api):
    """Recria os dados fictícios antes de cada teste: nenhum teste depende do anterior."""
    assert api.post("/demonstracao/reinicio") == 204, "a API precisa estar em modo de demonstração"


def pytest_configure(config):
    config.addinivalue_line("markers", "regra(numero): verifica a regra de mesmo número em docs/produto.md")
    config.addinivalue_line("markers", "critico: falha neste teste reprova a entrega")


# ---------------------------------------------------------------- resultado em JSON para o qa/rodar.py

_resultados: dict[str, dict] = {}


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    relatorio = (yield).get_result()
    if relatorio.when == "call" or relatorio.outcome != "passed":
        regra = item.get_closest_marker("regra")
        anterior = _resultados.get(item.nodeid, {})
        if anterior.get("resultado") in ("failed", "error"):
            return  # a primeira falha (no preparo ou no teste) é a que conta
        resultado = relatorio.outcome if relatorio.when == "call" else ("skipped" if relatorio.skipped else "error")
        _resultados[item.nodeid] = {
            "teste": item.name,
            "arquivo": Path(str(item.fspath)).name,
            "descricao": (item.obj.__doc__ or "").strip().split("\n")[0]
            + (f" [{item.callspec.id}]" if hasattr(item, "callspec") else ""),
            "regra": regra.args[0] if regra else None,
            "critico": item.get_closest_marker("critico") is not None,
            "resultado": resultado,
            "motivo": _motivo(relatorio) if relatorio.outcome != "passed" else "",
        }


def _motivo(relatorio) -> str:
    if relatorio.skipped and isinstance(relatorio.longrepr, tuple):
        return str(relatorio.longrepr[2])
    crash = getattr(relatorio.longrepr, "reprcrash", None)
    return (crash.message if crash else str(relatorio.longrepr)).strip()[:600]


def pytest_sessionfinish(session):
    ARQUIVO_RESULTADO.write_text(json.dumps(list(_resultados.values()), ensure_ascii=False, indent=2), encoding="utf-8")
