"""População fictícia em escala: os pacientes além dos 15 personagens do roteiro da demonstração.

Gera sempre as mesmas pessoas (sorteio com semente fixa), espalhadas por todas as situações da fila da
enfermagem, para o painel da APS mostrar como fica com uma carteira real (a APS do SESI atende cerca de
10 mil vidas). Nomes, empresas e situações são inventados.
"""

import random
from collections.abc import Callable
from typing import TYPE_CHECKING

from selo_saude.modulos.cadastro.servico import TURNOS
from selo_saude.modulos.monitoramento.regras import PRAZO_EM_DIAS

if TYPE_CHECKING:
    from .semente import Pessoa

TOTAL_DE_PACIENTES = 10_303
TOTAL_DE_EMPRESAS = 104
"""A APS do SESI atende 104 indústrias parceiras (número real do desafio). Os nomes são inventados."""

RAMOS = [
    "Metalúrgica", "Siderúrgica", "Plásticos", "Alimentos", "Têxtil", "Cerâmica", "Química", "Bebidas",
    "Calçados", "Móveis", "Embalagens", "Autopeças", "Papel e Celulose", "Vidros", "Borrachas", "Tintas",
    "Laticínios", "Gráfica", "Fundição", "Cimentos",
]  # fmt: skip
LUGARES = [
    "Paraguaçu", "Jacuípe", "Joanes", "Abaeté", "Itapuã", "Candeias", "Pojuca", "Sauípe", "Subaé", "Jequiriçá",
    "Chapada", "Recôncavo", "Litoral Norte", "Baía Azul", "Vale do Sol", "Serra Verde", "Rio Vermelho", "Mata Sul",
    "Pedra Branca", "Boa Vista", "Atalaia", "Estrela", "Aratu", "Ipitanga",
]  # fmt: skip


def empresas_parceiras(fixas: list[str]) -> list[str]:
    """As 104 indústrias: as dos personagens do roteiro e mais nomes inventados, sempre os mesmos."""
    s = random.Random(104)
    nomes = list(fixas)
    while len(nomes) < TOTAL_DE_EMPRESAS:
        nome = f"{s.choice(RAMOS)} {s.choice(LUGARES)} {s.choice(['Ltda', 'Ltda', 'S.A.'])}"
        if nome not in nomes:
            nomes.append(nome)
    return nomes


PRIMEIROS_NOMES = [
    "Adriana", "Alex", "Amanda", "André", "Beatriz", "Bruno", "Camila", "Carlos", "Cíntia", "Cláudio",
    "Daiane", "Daniel", "Débora", "Diego", "Elaine", "Emerson", "Fabiana", "Fábio", "Gabriela", "Gilson",
    "Helena", "Hugo", "Isabela", "Igor", "Jaqueline", "Jefferson", "Joana", "Jorge", "Karina", "Leonardo",
    "Larissa", "Lucas", "Márcia", "Mateus", "Natália", "Nilton", "Paula", "Pedro", "Priscila", "Renato",
    "Rosana", "Rodrigo", "Simone", "Sérgio", "Tatiane", "Thiago", "Vanessa", "Vítor", "Viviane", "Wellington",
]  # fmt: skip
SOBRENOMES = [
    "Almeida", "Alves", "Andrade", "Araújo", "Barbosa", "Barreto", "Batista", "Bispo", "Brito", "Cardoso",
    "Carvalho", "Conceição", "Costa", "Cruz", "Dias", "Fernandes", "Ferreira", "Gomes", "Jesus", "Lima",
    "Lopes", "Machado", "Martins", "Matos", "Melo", "Mendes", "Moreira", "Nascimento", "Neves", "Oliveira",
    "Pereira", "Pinto", "Ramos", "Reis", "Ribeiro", "Rocha", "Santana", "Santos", "Silva", "Souza",
]  # fmt: skip
FUNCOES = [
    "Operador de produção", "Auxiliar de produção", "Operadora de máquinas", "Soldador", "Mecânico de manutenção",
    "Eletricista", "Almoxarife", "Embaladora", "Separador de pedidos", "Técnico de segurança", "Caldeireiro",
    "Montador", "Inspetora de qualidade", "Operador de empilhadeira", "Costureira", "Torneiro mecânico",
    "Líder de linha", "Analista de processos", "Auxiliar de limpeza", "Motorista",
]  # fmt: skip
MOTIVOS = ["tempo", "transporte", "nao_entendi", "remedio", "dinheiro", "outro"]


def _perfis(s: random.Random) -> list[tuple[int, Callable[[int], dict]]]:
    """Cada perfil leva a pessoa para uma situação da fila. O peso é a fatia aproximada da carteira."""

    def prazo(risco: int) -> int:
        return PRAZO_EM_DIAS[risco]

    def em_dia(r: int) -> dict:
        return {"plano": "recebido", "ultimo": s.randint(5, max(6, prazo(r) - 25)), "passos_feitos": s.randint(0, 4)}

    def confirmado(r: int) -> dict:
        return {
            **em_dia(r),
            "consulta": (s.randint(2, 40), s.choice([7, 9, 10, 14, 15, 16]), "confirmada", s.random() < 0.25),
        }

    def agendado(r: int) -> dict:
        return {**em_dia(r), "consulta": (s.randint(5, 40), s.choice([8, 9, 10, 15, 16]), "agendada", False)}

    def vence_logo(r: int) -> dict:
        return {"plano": "recebido", "ultimo": prazo(r) - s.randint(0, 14), "passos_feitos": s.randint(0, 3)}

    def fora_do_prazo(r: int) -> dict:
        return {"plano": "recebido", "ultimo": prazo(r) + s.randint(1, 150), "faltas": s.choice([0, 0, 1, 2])}

    def plano_parado(r: int) -> dict:
        ultimo = s.randint(8, max(9, prazo(r) - 20))
        return {"plano": "enviado", "ultimo": ultimo, "plano_enviado": s.randint(3, min(60, ultimo - 1))}

    def sem_plano(r: int) -> dict:
        return {"plano": "nao_enviado", "ultimo": s.randint(1, 12)}

    def sem_resposta(r: int) -> dict:
        return {
            **em_dia(r),
            "consulta": (s.randint(2, 20), s.choice([9, 10, 15]), "agendada", False),
            "lembrete": s.randint(3, 12),
        }

    def remarcar(r: int) -> dict:
        return {**em_dia(r), "consulta": (s.randint(1, 10), s.choice([9, 15]), "remarcar", False)}

    def faltou(r: int) -> dict:
        return {
            **em_dia(r),
            "consulta": (-s.randint(1, 25), s.choice([9, 10, 15]), "faltou", False),
            "faltas": s.randint(1, 3),
        }

    def dificuldade(r: int) -> dict:
        return {
            **em_dia(r),
            "passos_feitos": s.randint(0, 2),
            "dificuldade": (s.choice(MOTIVOS), s.randint(0, 3), s.randint(0, 9), s.choice(["plano", "checkin"])),
        }

    def pediu_ajuda(r: int) -> dict:
        return {**em_dia(r), "checkin": s.randint(0, 5), "pediu_contato": True}

    def em_contato(r: int) -> dict:
        return {**vence_logo(r), "contato": s.randint(0, 6)}

    return [
        (30, em_dia), (14, confirmado), (6, agendado), (8, vence_logo), (8, fora_do_prazo), (6, plano_parado),
        (2, sem_plano), (6, sem_resposta), (3, remarcar), (4, faltou), (5, dificuldade), (3, pediu_ajuda),
        (5, em_contato),
    ]  # fmt: skip


def gerar(quantidade: int, empresas: list[str]) -> list["Pessoa"]:
    from .semente import Pessoa

    s = random.Random(2026)
    perfis = _perfis(s)
    pesos = [p for p, _ in perfis]
    # Tamanhos desiguais, como na vida real: poucas plantas grandes e muitas pequenas.
    tamanho_das_empresas = [s.lognormvariate(0, 0.9) for _ in empresas]
    pessoas = []
    for _ in range(quantidade):
        risco = s.choices([1, 2, 3, 4], weights=[35, 35, 22, 8])[0]
        _, perfil = s.choices(perfis, weights=pesos)[0]
        nome = f"{s.choice(PRIMEIROS_NOMES)} {s.choice(SOBRENOMES)} {s.choice(SOBRENOMES)}"
        pessoas.append(
            Pessoa(
                nome=nome,
                funcao=s.choice(FUNCOES),
                empresa=s.choices(empresas, weights=tamanho_das_empresas)[0],
                turno=s.choices(TURNOS, weights=[35, 30, 20, 15])[0],
                risco=risco,
                **{"faltas": s.choice([0, 0, 0, 1]), **perfil(risco)},
            )
        )
    return pessoas
