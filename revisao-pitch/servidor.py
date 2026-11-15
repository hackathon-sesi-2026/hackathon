"""Servidor local da revisão do pitch.

Serve a deck (deck/), as imagens (blob/) e guarda as anotações em notas.json,
para a equipe e o Claude lerem depois. Uso: py -3.12 servidor.py  ->  http://localhost:5180
"""

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
NOTAS = RAIZ / "notas.json"
PORTA = 5180


def ler_notas():
    if NOTAS.exists():
        return json.loads(NOTAS.read_text(encoding="utf-8"))
    return {"heroEscolhida": None, "notas": {}, "novos": []}


class Manipulador(BaseHTTPRequestHandler):
    def _enviar(self, corpo: bytes, tipo: str, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        caminho = self.path.split("?")[0]
        if caminho == "/api/notas":
            return self._enviar(json.dumps(ler_notas(), ensure_ascii=False).encode(), "application/json")
        if caminho.startswith("/_blob/"):
            ident = caminho.removeprefix("/_blob/")
            achados = list((RAIZ / "blob").glob(f"{ident}.*"))
            if not achados:
                return self._enviar(b"", "text/plain", 404)
            alvo = achados[0]
        else:
            alvo = (RAIZ / (caminho.lstrip("/") or "index.html")).resolve()
            if RAIZ not in alvo.parents and alvo != RAIZ or not alvo.is_file():
                return self._enviar(b"nao encontrado", "text/plain", 404)
        tipo = mimetypes.guess_type(alvo.name)[0] or "application/octet-stream"
        if tipo.startswith("text/") or tipo == "application/json":
            tipo += "; charset=utf-8"
        self._enviar(alvo.read_bytes(), tipo)

    def do_PUT(self):
        if self.path != "/api/notas":
            return self._enviar(b"", "text/plain", 404)
        tamanho = int(self.headers.get("Content-Length", 0))
        dados = json.loads(self.rfile.read(tamanho) or b"{}")
        NOTAS.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
        self._enviar(b'{"ok":true}', "application/json")

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    print(f"Revisão do pitch em http://localhost:{PORTA}")
    ThreadingHTTPServer(("127.0.0.1", PORTA), Manipulador).serve_forever()
