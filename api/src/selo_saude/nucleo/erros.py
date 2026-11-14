from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ErroDeDominio(Exception):
    """Erro esperado, com mensagem que pode ser mostrada a quem chamou."""

    status = 400


class NaoEncontrado(ErroDeDominio):
    status = 404


class RegraViolada(ErroDeDominio):
    status = 409


def registrar_tratadores(app: FastAPI) -> None:
    @app.exception_handler(ErroDeDominio)
    async def _tratar(_requisicao: Request, erro: ErroDeDominio) -> JSONResponse:
        return JSONResponse(status_code=erro.status, content={"detalhe": str(erro)})
