import os

# Teste nunca manda WhatsApp de verdade, mesmo com a Mega-API configurada no api/.env.
os.environ["SELO_WHATSAPP"] = "simulado"
