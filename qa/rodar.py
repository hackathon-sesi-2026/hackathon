"""Roda o QA completo e dá o veredito: APROVADO, APROVADO COM RESSALVAS ou REPROVADO.

    api/.venv/Scripts/python qa/rodar.py            # testes de regra, fluxos e telas + checagem dos MDs
    api/.venv/Scripts/python qa/rodar.py --sem-telas  # pula o navegador (mais rápido)
    api/.venv/Scripts/python qa/rodar.py --build      # inclui pytest/ruff da API e o build do front

Critério:
- REPROVADO: sistema fora do ar, build quebrado, ou falha em teste marcado como crítico
  (regras que não se negociam e fluxos centrais da demonstração).
- APROVADO COM RESSALVAS: só falhas não críticas, MDs que citam o que não existe, regra do produto
  sem teste, ou parte da verificação pulada.
- APROVADO: tudo passou, tudo coberto, documentação bate com o sistema.

O relatório sai na tela e em qa/relatorio.md. Código de saída: 0, 1 ou 2, na ordem acima.
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

QA = Path(__file__).resolve().parent
RAIZ = QA.parent
sys.path.insert(0, str(QA))

from verificar_docs import regras_do_produto, verificar  # noqa: E402

URL_WEB = os.environ.get("QA_URL_WEB", "http://localhost:5173").rstrip("/")
PYTHON = sys.executable
NPM = "npm.cmd" if os.name == "nt" else "npm"

# Regras do produto.md que não dá para testar contra o sistema rodando, e por quê.
REGRAS_MANUAIS = {
    "6": "Arquitetural: confere-se no código (integrações só em api/src/selo_saude/integracoes/), não em execução.",
    "7": "Dados fictícios e números ilustrativos: confere-se no seed e no pitch, não em execução.",
}

APROVADO, RESSALVAS, REPROVADO = "APROVADO", "APROVADO COM RESSALVAS", "REPROVADO"


def no_ar(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=4) as resposta:
            return resposta.status == 200
    except Exception:
        return False


def rodar(comando: list[str], pasta: Path) -> tuple[bool, str]:
    processo = subprocess.run(comando, cwd=pasta, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return processo.returncode == 0, (processo.stdout + processo.stderr).strip()


def main() -> int:
    argumentos = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    argumentos.add_argument("--sem-telas", action="store_true", help="não abre o navegador")
    argumentos.add_argument("--build", action="store_true", help="inclui testes unitários, lint e build do front")
    opcoes = argumentos.parse_args()

    inicio = time.monotonic()
    bloqueios: list[str] = []
    ressalvas: list[str] = []
    linhas: list[str] = []

    # 1. Sistema no ar
    web_ok, api_ok = no_ar(f"{URL_WEB}/painel/aps"), no_ar(f"{URL_WEB}/api/saude")
    if not (web_ok and api_ok):
        fora = ", ".join(n for n, ok in (("front (5173)", web_ok), ("API pelo front (/api)", api_ok)) if not ok)
        return relatar(REPROVADO, [f"Sistema fora do ar: {fora}. Suba banco, API e front antes do QA."], [], [], inicio)

    # 2. Testes ponta a ponta
    resultado = QA / ".resultado.json"
    resultado.unlink(missing_ok=True)
    comando = [PYTHON, "-m", "pytest", str(QA), "-q", "-p", "no:cacheprovider", "--tb=no", "-rN"]
    if opcoes.sem_telas:
        comando += ["--ignore", str(QA / "test_telas.py")]
        ressalvas.append("Telas não verificadas no navegador (--sem-telas).")
    rodar(comando, RAIZ)
    testes = json.loads(resultado.read_text(encoding="utf-8")) if resultado.exists() else []
    if not testes:
        return relatar(REPROVADO, ["A suíte de testes não rodou. Rode `pytest qa` para ver o erro."], [], [], inicio)

    for t in testes:
        if t["resultado"] in ("failed", "error"):
            origem = f"regra {t['regra']}" if t["regra"] else t["arquivo"]
            alvo = f"[{origem}] {t['descricao'] or t['teste']}: {t['motivo']}"
            (bloqueios if t["critico"] else ressalvas).append(alvo)
        elif t["resultado"] == "skipped":
            ressalvas.append(f"[pulado] {t['descricao'] or t['teste']}: {t['motivo']}")

    # 3. Cobertura das regras do produto
    regras = regras_do_produto()
    por_regra: dict[str, list[dict]] = {}
    for t in testes:
        if t["regra"]:
            por_regra.setdefault(t["regra"], []).append(t)
    for numero, titulo in regras.items():
        casos = por_regra.get(numero, [])
        if numero in REGRAS_MANUAIS and not casos:
            situacao = "manual"
        elif not casos:
            situacao = "SEM TESTE"
            ressalvas.append(f"Regra {numero} ({titulo}) não tem teste nem justificativa em REGRAS_MANUAIS.")
        elif all(c["resultado"] == "passed" for c in casos):
            situacao = f"ok ({len(casos)})"
        else:
            falhas = sum(c["resultado"] != "passed" for c in casos)
            situacao = f"FALHOU ({falhas} de {len(casos)})"
        linhas.append(f"| {numero} | {titulo} | {situacao} |")

    # 4. MDs de contexto contra o sistema
    for problema in verificar(f"{URL_WEB}/api"):
        ressalvas.append(f"[docs] {problema}")

    # 5. Verificação completa (opcional)
    if opcoes.build:
        for nome, comando_extra, pasta in (
            ("testes unitários da API", [PYTHON, "-m", "pytest", "-q"], RAIZ / "api"),
            ("lint da API", [PYTHON, "-m", "ruff", "check", "src", "tests"], RAIZ / "api"),
            ("build do front", [NPM, "run", "build"], RAIZ / "web"),
        ):
            ok, saida = rodar(comando_extra, pasta)
            if not ok:
                bloqueios.append(f"[{nome}] falhou: {saida.splitlines()[-1] if saida else 'sem saída'}")

    veredito = REPROVADO if bloqueios else RESSALVAS if ressalvas else APROVADO
    return relatar(veredito, bloqueios, ressalvas, linhas, inicio, testes)


def relatar(veredito, bloqueios, ressalvas, linhas, inicio, testes=None) -> int:
    testes = testes or []
    passaram = sum(t["resultado"] == "passed" for t in testes)
    partes = [
        f"# QA Selo Saúde: {veredito}",
        "",
        f"{passaram} de {len(testes)} verificações passaram em {time.monotonic() - inicio:.0f} s.",
    ]
    if linhas:
        partes += [
            "",
            "## Regras do produto (docs/produto.md)",
            "",
            "| # | Regra | Situação |",
            "|---|---|---|",
            *linhas,
        ]
    if bloqueios:
        partes += ["", "## Bloqueios (reprovam)", "", *[f"- {b}" for b in bloqueios]]
    if ressalvas:
        partes += ["", "## Ressalvas", "", *[f"- {r}" for r in ressalvas]]
    if testes:
        partes += ["", "## Verificações", "", "| Resultado | Crítico | Verificação |", "|---|---|---|"]
        simbolo = {"passed": "ok", "failed": "FALHOU", "error": "ERRO", "skipped": "pulado"}
        for t in testes:
            partes.append(
                f"| {simbolo[t['resultado']]} | {'sim' if t['critico'] else ''} | {t['descricao'] or t['teste']} |"
            )
    texto = "\n".join(partes) + "\n"
    (QA / "relatorio.md").write_text(texto, encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(texto)
    return {APROVADO: 0, RESSALVAS: 1, REPROVADO: 2}[veredito]


if __name__ == "__main__":
    sys.exit(main())
