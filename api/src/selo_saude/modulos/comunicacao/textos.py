"""Todo texto que o trabalhador recebe. Funções puras, fáceis de revisar com a equipe de saúde.

Regras do tom (ver docs/pesquisa/gatilhos-mentais.md):
- frase curta, sem termo técnico e sem nenhum dado clínico (diagnóstico, exame, remédio);
- a mensagem vem em nome da enfermeira de referência, não de "um sistema";
- o ganho citado é o que a própria pessoa disse que importa;
- sem medo, culpa, escassez falsa ou urgência artificial.
"""

from dataclasses import dataclass, field

from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.cadastro.servico import DadosTrabalhador
from selo_saude.modulos.plano.servico import DadosPlano
from selo_saude.nucleo.relogio import dia_semana, hora_curta


@dataclass(frozen=True)
class Texto:
    texto: str
    acoes: list[str] = field(default_factory=list)
    passo_id: str | None = None


_GANHO = {
    "familia": "estar bem para a sua família",
    "energia": "ter mais energia no dia a dia",
    "menos_dor": "sentir menos dor no corpo",
    "sono": "dormir melhor",
}

RESPOSTA_DO_TRABALHADOR = {
    "confirmar": "Confirmo ✅",
    "remarcar": "Preciso remarcar",
    "checkin_ok": "Tudo bem 👍",
    "checkin_ajuda": "Quero falar com a enfermeira",
    "habito_sim": "Consegui ✅",
    "habito_nao": "Não consegui 😕",
    "se_turno": "Saio do turno e vou direto",
    "se_folga": "Vou no meu dia de folga",
    "se_so_lembrete": "Só me lembre",
}

# Resposta automática a cada motivo do "não consegui".
RESPOSTA_AO_MOTIVO = {
    "tempo": "Obrigado por contar! Dá para fazer por vídeo ou num horário fora do seu turno. "
    "A enfermeira também vai te procurar.",
    "transporte": "Entendi. Tem opção por vídeo, de casa, sem perder o fretado. A enfermeira vai combinar com você.",
    "nao_entendi": "Sem problema, é normal ter dúvida. A enfermeira vai te ligar para explicar com calma.",
    "remedio": "Obrigado por avisar. Não pare por conta própria: a equipe vai falar com você ainda hoje.",
    "dinheiro": "Obrigado por contar. A enfermeira vai te mostrar opções sem custo.",
    "outro": "Obrigado por contar. A enfermeira vai entrar em contato para entender e ajudar.",
}

REMARCACAO = Texto(
    "Sem problema! Escolha um horário que não bata com o seu turno. Tem opção por vídeo também.", ["escolher_horario"]
)
CHECKIN_TUDO_BEM = Texto("Que bom! Continue com o seu plano. Se precisar de algo, é só chamar.")
CHECKIN_PEDIU_CONTATO = Texto("Certo! A enfermeira vai entrar em contato com você em até 2 dias úteis.")
HABITO_FEITO = Texto("Boa! Cada passo conta. Seu próximo passo já está no seu plano.", ["plano"])
SO_LEMBRETE = Texto("Combinado, só o lembrete. 👍")


def _ganho(t: DadosTrabalhador) -> str:
    return _GANHO.get(t.motivacao or "", "se manter bem para o que importa")


def _ola(t: DadosTrabalhador) -> str:
    return f"Olá, {t.primeiro_nome}! Aqui é a {t.enfermeira}, sua enfermeira no SESI."


def _onde(c: DadosConsulta) -> str:
    if c.modalidade == "online":
        return "por vídeo"
    if c.modalidade == "no_turno":
        return f"no {c.local}, dentro do turno"
    return f"no {c.local}"


def lembrete(t: DadosTrabalhador, c: DadosConsulta | None) -> Texto:
    if c and c.em_aberto:
        return Texto(
            f"{_ola(t)} Seu retorno está marcado para {dia_semana(c.data)}, às {hora_curta(c.data)}, {_onde(c)}. "
            f"Ele ajuda você a {_ganho(t)}. Você consegue ir?\n\n"
            "Se não puder, remarque aqui: assim a vaga fica livre para um colega.",
            ["confirmar", "remarcar", "plano"],
        )
    return Texto(
        f"{_ola(t)} Está na hora do seu retorno, para você {_ganho(t)}. "
        "Vamos escolher um horário que caiba no seu turno? Tem opção por vídeo também.",
        ["escolher_horario", "plano"],
    )


def lembrete_automatico(t: DadosTrabalhador, c: DadosConsulta, qual: str) -> Texto:
    """D-3 e D-1: mais de um lembrete funciona melhor que um só. O D-1 retoma o que a pessoa combinou."""
    quando = "Amanhã" if qual == "D-1" else f"Na {dia_semana(c.data)}"
    combinado = f" Você combinou: {c.compromisso}. 💪" if c.compromisso else ""
    confirmada = c.status == "confirmada"
    fecho = " Seu horário está garantido, sem fila." if confirmada else " Confirma para garantir seu horário sem fila?"
    return Texto(
        f"{_ola(t)} {quando}, às {hora_curta(c.data)}, é o seu retorno {_onde(c)}.{combinado}{fecho}",
        ["remarcar", "plano"] if confirmada else ["confirmar", "remarcar"],
    )


def confirmado(c: DadosConsulta) -> Texto:
    """Recompensa imediata (horário garantido) e convite opcional para o plano se-então."""
    base = (
        f"Combinado! ✅ Seu horário de {dia_semana(c.data)}, às {hora_curta(c.data)}, está garantido: "
        "você é atendido(a) na hora marcada, sem fila. Eu te lembro 3 dias antes e 1 dia antes."
    )
    if c.modalidade == "online":
        return Texto(base)
    return Texto(f"{base}\n\nQuer combinar como vai? É opcional.", ["se_turno", "se_folga", "se_so_lembrete"])


def agendado(c: DadosConsulta) -> Texto:
    if c.modalidade == "online":
        onde = "por vídeo (o link chega aqui no dia)"
    elif c.modalidade == "no_turno":
        sem_nome = "" if c.nome_para_lideranca else ", sem o seu nome"
        onde = (
            f"no {c.local}, dentro do seu turno (20 min). "
            f"Sua liderança recebe só o horário da liberação{sem_nome}, nunca o motivo"
        )
    else:
        onde = f"no {c.local}"
    return Texto(f"Pronto! Seu retorno ficou para {dia_semana(c.data)}, às {hora_curta(c.data)}, {onde}.")


def compromisso(c: DadosConsulta, opcao: str) -> Texto:
    quando = dia_semana(c.data)
    if opcao == "se_turno":
        return Texto(f"Fechado: quando sair do turno na {quando}, você vai direto. Eu te lembro disso um dia antes. 💪")
    if opcao == "se_folga":
        return Texto(f"Fechado: você vai no seu dia de folga, {quando}. Eu te lembro um dia antes. 💪")
    return SO_LEMBRETE


def plano_pronto(t: DadosTrabalhador) -> Texto:
    return Texto(
        f"{_ola(t)} Seu plano de cuidado está pronto. São poucos passos, em linguagem simples, para você {_ganho(t)}. "
        "Só você e a equipe de saúde veem.",
        ["plano"],
    )


def checkin_habito(t: DadosTrabalhador, plano: DadosPlano) -> Texto | None:
    """Pergunta sobre o próximo passo pendente. O título do passo pode ser sensível, então vai só o número."""
    passo = plano.proximo_passo
    if passo is None:
        return None
    numero = plano.passos.index(passo) + 1
    return Texto(
        f"Oi, {t.primeiro_nome}! Aqui é a {t.enfermeira}. Passando para saber do seu plano: "
        f'esta semana você conseguiu fazer o passo {numero}? (Toque em "Ver meu plano" se quiser lembrar qual é.)',
        ["habito_sim", "habito_nao", "plano"],
        passo.id,
    )


def checkin(t: DadosTrabalhador) -> Texto:
    return Texto(
        f"Oi, {t.primeiro_nome}! Aqui é a {t.enfermeira}. "
        "Passando para saber: como você está desde o último atendimento?",
        ["checkin_ok", "checkin_ajuda"],
    )


def resultado_liberado(t: DadosTrabalhador) -> Texto:
    """Só o aviso e o caminho para a página pessoal. Nenhum valor ou nome de exame vai pelo WhatsApp."""
    return Texto(
        f"Oi, {t.primeiro_nome}! Aqui é a {t.enfermeira}. O resultado dos seus exames saiu. "
        "Veja na sua página pessoal, com explicação simples. Por segurança, aqui não mostramos detalhes.",
        ["exames"],
    )


def selo(nome: str, emoji: str, semanas: int) -> Texto:
    return Texto(
        f'{emoji} Você ganhou o selo "{nome}": {semanas} semanas seguidas cuidando de você. Ele fica no seu plano.'
    )
