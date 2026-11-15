"""Confere se os MDs de contexto descrevem o sistema que existe.

Não testa comportamento (isso é dos testes); testa se a documentação aponta para coisas reais:
arquivos e pastas citados, rotas do front, rotas da API, e se cada regra do produto tem teste.
"""

import json
import re
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOCUMENTOS = [
    RAIZ / "CLAUDE.md",
    RAIZ / "README.md",
    *sorted((RAIZ / "docs").glob("*.md")),
    *sorted((RAIZ / "docs" / "pesquisa").glob("*.md")),
]
# Onde um caminho citado sem prefixo costuma morar.
BASES = [
    RAIZ,
    RAIZ / "docs",
    RAIZ / "docs" / "materiais-sesi",
    RAIZ / "api",
    RAIZ / "web",
    RAIZ / "api" / "src" / "selo_saude",
    RAIZ / "api" / "src" / "selo_saude" / "modulos",  # `pulso/servico.py`
    RAIZ / "web" / "src",
    RAIZ / "web" / "src" / "superficies",
]
# Skills do projeto: `/qa-tester` é comando do Claude Code, não rota de tela.
SKILLS = {p.name for p in (RAIZ / ".claude" / "skills").glob("*") if p.is_dir()}
EXTENSOES = (".md", ".py", ".ts", ".tsx", ".png", ".json", ".yml", ".ini", ".html", ".jpeg", ".css", ".mako")


def regras_do_produto() -> dict[str, str]:
    """Número e título de cada item em "Regras que não se negociam"."""
    texto = (RAIZ / "docs" / "produto.md").read_text(encoding="utf-8")
    secao = texto.split("## Regras que não se negociam", 1)[-1].split("\n## ", 1)[0]
    return {n: titulo.rstrip(".") for n, titulo in re.findall(r"^(\d+)\. \*\*(.+?)\*\*", secao, re.MULTILINE)}


def _rotas_do_front() -> set[str]:
    texto = (RAIZ / "web" / "src" / "rotas.tsx").read_text(encoding="utf-8")
    rotas = set()
    for caminho in re.findall(r"path: '([^']+)'", texto):
        if caminho == "*":
            continue
        rotas.add(caminho if caminho.startswith("/") else f"/painel/{caminho}")
    return rotas


def _rotas_da_api(url_api: str) -> set[str] | None:
    try:
        with urllib.request.urlopen(f"{url_api.rsplit('/api', 1)[0]}/api/openapi.json", timeout=5) as r:
            return set(json.load(r)["paths"])
    except Exception:
        try:  # o front não repassa /openapi.json; tenta a API direto
            with urllib.request.urlopen("http://localhost:8000/openapi.json", timeout=5) as r:
                return set(json.load(r)["paths"])
        except Exception:
            return None


def _rota_bate(citada: str, existentes: set[str]) -> bool:
    for existente in existentes:
        padrao = "^" + re.sub(r"\\\{[^}]+\\\}|:[A-Za-z]+", "[^/]+", re.escape(existente).replace(r"\:", ":")) + "$"
        padrao = re.sub(r":[A-Za-z]+", "[^/]+", padrao)
        if re.match(padrao, citada) or citada == existente:
            return True
    return False


def _prefixo_de_rotas(citada: str, existentes: set[str]) -> bool:
    """`/api/aps` citado como grupo: vale se alguma rota começa por ele."""
    return any(existente.startswith(citada.rstrip("/") + "/") for existente in existentes)


def _expandir(citacao: str) -> list[str]:
    """/painel/{aps,lideranca,rh} -> três rotas."""
    m = re.search(r"\{([^}]*,[^}]*)\}", citacao)
    if not m:
        return [citacao]
    return [citacao[: m.start()] + parte + citacao[m.end() :] for parte in m.group(1).split(",")]


def verificar(url_api: str) -> list[str]:
    """Lista de problemas encontrados. Vazia quando a documentação bate com o sistema."""
    problemas: list[str] = []
    rotas_front = _rotas_do_front()
    rotas_api = _rotas_da_api(url_api)
    if rotas_api is None:
        problemas.append("Não foi possível ler o openapi.json da API: rotas citadas nos MDs não foram conferidas.")

    for documento in DOCUMENTOS:
        nome = documento.relative_to(RAIZ).as_posix()
        texto = re.sub(r"```.*?```", "", documento.read_text(encoding="utf-8"), flags=re.DOTALL)
        for citacao in sorted(set(re.findall(r"`([^`\n]+)`", texto))):
            citacao = citacao.strip()
            if any(
                c in citacao for c in (" ", "<", "*", "...", "…", "=", "(", "|", "$", "@")
            ) and not citacao.startswith(("GET ", "POST ", "PUT ")):
                continue
            # Rota da API, com ou sem método na frente.
            rota = re.sub(r"^(GET|POST|PUT|DELETE) ", "", citacao)
            if rota.startswith("/api/"):
                sem_consulta, conhecidas = rota.split("?")[0], rotas_api or set()
                existe = _rota_bate(sem_consulta, conhecidas) or _prefixo_de_rotas(sem_consulta, conhecidas)
                if rotas_api is not None and not existe:
                    problemas.append(f"{nome}: rota da API `{citacao}` não existe")
                continue
            if rota.lstrip("/") in SKILLS:
                continue
            # Rota do front.
            if rota.startswith("/") and not rota.startswith("//"):
                for expandida in _expandir(rota):
                    if expandida.endswith("/..."):
                        continue
                    if not _rota_bate(expandida, rotas_front):
                        problemas.append(f"{nome}: rota de tela `{expandida}` não existe em web/src/rotas.tsx")
                continue
            # Arquivo ou pasta.
            parece_caminho = "/" in citacao or citacao.endswith(EXTENSOES)
            if (
                not parece_caminho
                or citacao.startswith(("http", "claude.ai", "localhost", "npm", "@"))
                or ":" in citacao
            ):
                continue
            if "/" not in citacao.rstrip("/") and not citacao.endswith((".md", ".png")):
                continue  # nome solto (textos.py, regras.py): ambíguo de propósito
            alvo = citacao.rstrip("/")
            bases = [documento.parent, *BASES]
            if not any((base / alvo).exists() for base in bases):
                problemas.append(f"{nome}: caminho `{citacao}` não existe")
    return problemas


if __name__ == "__main__":
    for problema in verificar("http://localhost:5173/api") or ["Documentação consistente."]:
        print(problema)
