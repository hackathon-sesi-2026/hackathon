# Alternativa ao systemd (docs/deploy.md): a API em um contêiner. Usa o Postgres que você já tem, por SELO_URL_BANCO.
#   docker build -t selo-saude-api ./api
#   docker run -d --name selo-saude-api --restart always --env-file api/.env --network host selo-saude-api
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
COPY migracoes ./migracoes
COPY alembic.ini ./
RUN pip install --no-cache-dir -e .
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn selo_saude.main:app --app-dir src --host 0.0.0.0 --port 8000"]
