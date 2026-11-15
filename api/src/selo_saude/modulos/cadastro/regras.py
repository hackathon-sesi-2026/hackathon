"""Regras puras do cadastro."""


def so_digitos(texto: str) -> str:
    return "".join(c for c in texto if c.isdigit())


def digitos_verificadores(base: str) -> str:
    """Os dois dígitos finais do CPF, calculados a partir dos 9 primeiros."""
    digitos = [int(c) for c in base]
    for _ in range(2):
        peso = len(digitos) + 1
        resto = sum(d * (peso - i) for i, d in enumerate(digitos)) % 11
        digitos.append(0 if resto < 2 else 11 - resto)
    return f"{digitos[-2]}{digitos[-1]}"


def cpf_valido(cpf: str) -> bool:
    """CPF com 11 dígitos, que não seja um dígito repetido e com os verificadores certos."""
    numeros = so_digitos(cpf)
    if len(numeros) != 11 or len(set(numeros)) == 1:
        return False
    return digitos_verificadores(numeros[:9]) == numeros[9:]
