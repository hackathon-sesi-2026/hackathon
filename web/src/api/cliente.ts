// Em desenvolvimento o Vite repassa /api para a API local (vite.config.ts). Em produção, VITE_URL_API aponta para ela.
const BASE = `${import.meta.env.VITE_URL_API ?? ''}/api`

export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

async function pedir<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null)
    throw new ErroDaApi(resposta.status, erro?.detalhe ?? 'Não foi possível concluir. Tente de novo.')
  }
  return resposta.status === 204 ? (undefined as T) : resposta.json()
}

export const api = {
  get: <T>(caminho: string) => pedir<T>('GET', caminho),
  post: <T = void>(caminho: string, corpo?: unknown) => pedir<T>('POST', caminho, corpo),
  put: <T = void>(caminho: string, corpo?: unknown) => pedir<T>('PUT', caminho, corpo),
  urlDeEventos: (caminho: string) => BASE + caminho,
}
