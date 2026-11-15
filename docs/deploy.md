# Deploy: front na Vercel, API e banco na VPS

```
Navegador ──► https://selosaude.vercel.app  (Vercel: página inicial, totem, app do trabalhador e painéis)
                      │  /api/*  repassado pela Vercel (web/vercel.json)
                      ▼
              http://IP_DA_VPS:8000  (API em Python)  ──►  Postgres da própria VPS
```

O navegador só fala com a Vercel, então não precisa de HTTPS na VPS nem de CORS. A raiz `/` da Vercel é a página do
avaliador, com os três caminhos: Totem, App do Trabalhador e Painel + CRM.

## 1. Na VPS (uma vez)

Pré-requisitos: Python 3.12, git, `sudo` e o Postgres que você já tem instalado.

1. **Banco** (pule se já existir):
   ```bash
   sudo -u postgres psql -c "CREATE USER selo WITH PASSWORD 'TROQUE_A_SENHA';" -c "CREATE DATABASE selo_saude OWNER selo;"
   ```
2. **Código:**
   ```bash
   git clone URL_DO_REPOSITORIO hackathon && cd hackathon
   ```
3. **Configuração:** `cp api/.env.exemplo api/.env` e edite. O que muda na VPS:
   - `SELO_URL_BANCO=postgresql://selo:TROQUE_A_SENHA@127.0.0.1:5432/selo_saude`
   - `SELO_URL_PUBLICA=https://selosaude.vercel.app` (vai no link das mensagens do WhatsApp)
   - `SELO_MODO_DEMONSTRACAO=true` (cria os 10.303 pacientes fictícios na primeira subida)
   - WhatsApp real, se quiser: `SELO_WHATSAPP=megaapi` e as variáveis `SELO_MEGAAPI_*` (veja `docs/whatsapp.md`).
     Deixe `simulado` enquanto não for testar de verdade.
   - `SELO_WHATSAPP_EQUIPE=55...` (opcional): o número que o botão "Falar com a equipe" do app abre.
4. **Serviço:** edite `SEU_USUARIO` e o caminho em `deploy/selo-saude-api.service` e instale:
   ```bash
   sudo cp deploy/selo-saude-api.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable selo-saude-api
   ```
5. **Primeira subida:**
   ```bash
   bash deploy/atualizar.sh
   ```
   Cria o ambiente Python, aplica as migrações, inicia o serviço e espera a API responder (a primeira vez leva cerca de um minuto, criando os pacientes).
6. **Porta:** libere a 8000 no firewall (`sudo ufw allow 8000/tcp`) e confira de fora: `curl http://IP_DA_VPS:8000/api/saude`.

Para atualizar depois de cada `git push`: `bash deploy/atualizar.sh`.

Sem systemd? O `api/Dockerfile` roda a API em contêiner, usando o seu Postgres:
`docker build -t selo-saude-api ./api && docker run -d --name selo-saude-api --restart always --env-file api/.env --network host selo-saude-api`
(com `--network host`, o `127.0.0.1` do `.env` é o Postgres da VPS).

## 2. Na Vercel

1. Em `web/vercel.json`, troque `SEU_IP_DA_VPS` pelo IP da VPS e faça commit e push.
2. Na Vercel: **Add New → Project**, importe o repositório e configure:
   - **Root Directory:** `web`
   - **Project Name:** `selosaude` (vira `selosaude.vercel.app`; se o nome estiver ocupado, a Vercel sugere outro)
   - Framework: Vite (detectado), sem variáveis de ambiente.
3. **Deploy.** Cada `git push` na `main` gera um deploy novo sozinho.
4. Confira: `https://selosaude.vercel.app` (página do avaliador), `https://selosaude.vercel.app/api/saude` (a API pelo repasse)
   e os três botões da página.
5. Se o endereço final for outro, ajuste `SELO_URL_PUBLICA` no `api/.env` da VPS e rode `sudo systemctl restart selo-saude-api`.

## 3. No dia da apresentação

- **Reinicie os dados da demonstração:** `curl -X POST https://selosaude.vercel.app/api/demonstracao/reinicio`.
- **WhatsApp:** com `SELO_WHATSAPP=megaapi`, toda mensagem real vai para o `SELO_MEGAAPI_NUMERO_TESTE`. Com `simulado`, nada sai.
  O "Testar no meu WhatsApp" do painel só manda de verdade no modo `megaapi`.
- **Links úteis para a banca:** `/` (página inicial), `/totem` (qualquer CPF entra como o Marcos),
  `/t/47631cc369c040849413bac5` (app do Marcos) e `/painel/aps`.

## Se algo falhar

- **502 ou "Application error" em `/api/...`:** a API caiu ou a porta 8000 está fechada. `journalctl -u selo-saude-api -n 50`.
- **A tela abre, mas sem dados:** o IP no `web/vercel.json` está errado, ou o deploy da Vercel é anterior à troca do IP.
- **O painel não atualiza sozinho:** o tempo real usa uma conexão longa (SSE) e o repasse da Vercel pode derrubá-la de vez
  em quando. A tela reconecta e busca os dados de novo sozinha; atualizar a página resolve na hora.
- **Migração falhou:** confira `SELO_URL_BANCO` e se o usuário do Postgres é dono do banco.
