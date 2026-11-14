const DIA = 24 * 60 * 60 * 1000

export function addDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * DIA)
}

export function inicioDoDia(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function diasEntre(a: Date | string, b: Date | string): number {
  const da = inicioDoDia(new Date(a)).getTime()
  const db = inicioDoDia(new Date(b)).getTime()
  return Math.round((db - da) / DIA)
}

export function emDias(base: Date, dias: number, hora = 9, minuto = 0): string {
  const d = addDias(inicioDoDia(base), dias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

const fmtDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "quinta-feira, 20/11" */
export const diaSemana = (iso: string) => fmtDiaSemana.format(new Date(iso))
const fmtSemanaCurta = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
/** "Qua" */
export const semanaCurta = (iso: string) => {
  const s = fmtSemanaCurta.format(new Date(iso)).replace('.', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
/** "20/11/2026" */
export const data = (iso: string) => fmtData.format(new Date(iso))
/** "20/11" */
export const dataCurta = (iso: string) => fmtDataCurta.format(new Date(iso))
/** "15:00" */
export const hora = (iso: string) => fmtHora.format(new Date(iso))

/** "15h" ou "15h30" */
export function horaCurta(iso: string): string {
  const d = new Date(iso)
  const m = d.getMinutes()
  return `${d.getHours()}h${m ? String(m).padStart(2, '0') : ''}`
}

/** "hoje", "amanhã", "há 3 dias", "em 5 dias" */
export function relativo(iso: string, hoje = new Date()): string {
  const n = diasEntre(hoje, iso)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`
}

export const faixaTurno = (inicio: number, fim: number) => `${String(inicio).padStart(2, '0')}h às ${String(fim).padStart(2, '0')}h`
