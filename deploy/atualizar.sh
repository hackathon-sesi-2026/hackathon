#!/usr/bin/env bash
# Atualiza e reinicia a API do Selo Saúde na VPS. Rode da raiz do repositório clonado:
#   bash deploy/atualizar.sh
# Faz: git pull, instala as dependências, aplica as migrações do banco e reinicia o serviço.
# Pré-requisitos: Python 3.12, o Postgres já instalado, o arquivo api/.env criado (modelo em api/.env.exemplo)
# e o serviço instalado uma vez (veja docs/deploy.md). Não mexe em dados: só aplica migrações novas.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

if [ ! -f api/.env ]; then
  echo "Falta o api/.env. Copie api/.env.exemplo para api/.env e preencha (banco, URL pública, WhatsApp)." >&2
  exit 1
fi

echo "==> Baixando o código"
git pull --ff-only

echo "==> Dependências da API"
cd api
[ -d .venv ] || python3.12 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -e .

echo "==> Migrações do banco"
.venv/bin/alembic upgrade head

echo "==> Reiniciando o serviço"
sudo systemctl restart selo-saude-api

# Na primeira subida a API cria os 10.303 pacientes de demonstração, o que leva um minuto: espera até ela responder.
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/saude >/dev/null 2>&1; then
    echo "API no ar."
    exit 0
  fi
  sleep 3
done
echo "A API não respondeu em 3 minutos. Veja: journalctl -u selo-saude-api -n 50" >&2
exit 1
