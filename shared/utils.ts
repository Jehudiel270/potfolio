export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function slugify(input: string): string {
  return input
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export function formatMonth(iso?: string | null): string {
  if (!iso) return ''
  const [y, m] = iso.split('-')
  const mi = Number(m) - 1
  return mi >= 0 && mi < 12 ? `${MONTHS[mi]} ${y}` : String(y)
}
export function formatDateRange(start?: string | null, end?: string | null, current = false, nowLabel = 'aujourd’hui'): string {
  const s = formatMonth(start)
  const e = current ? nowLabel : formatMonth(end)
  return [s, e].filter(Boolean).join(' – ')
}
export const yearOf = (iso?: string | null) => (iso ? Number(iso.slice(0, 4)) : null)

/** Hex #rrggbb → composantes sRGB 0..1. */
export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [1, 1, 1]
  const n = parseInt(m[1]!, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
/** Normalisation destinée aux shaders (espace de travail linéaire de Three.js). */
export function hexToLinearRgb(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb01(hex)
  return [toLinear(r), toLinear(g), toLinear(b)]
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}
