import { QRCodeSVG } from 'qrcode.react'

/** Endereço da página pessoal do trabalhador. É o link que o SESI envia pelo WhatsApp. */
export function linkDoCelular(token: string): string {
  return `${window.location.origin}/t/${token}`
}

/** QR code que leva ao celular da pessoa, onde ela resolve o resto em particular. */
export function QrDoCelular({ token, tamanho = 96 }: { token: string; tamanho?: number }) {
  return <QRCodeSVG value={linkDoCelular(token)} size={tamanho} marginSize={2} className="shrink-0 rounded bg-white" />
}
