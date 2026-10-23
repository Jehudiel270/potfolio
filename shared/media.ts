export interface ImgOpts { w?: number, h?: number, fit?: 'fill' | 'limit' | 'fit' | 'scale' | 'pad' | 'thumb', q?: number | 'auto', format?: string }

/** Insère des transformations Cloudinary dans une URL de livraison. Les autres URL sont renvoyées telles quelles. */
export function cldUrl(url: string | null | undefined, o: ImgOpts = {}): string {
  if (!url) return ''
  const marker = '/image/upload/'
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url) || !url.includes(marker)) return url
  const parts = ['f_' + (o.format ?? 'auto'), 'q_' + (o.q ?? 'auto')]
  if (o.w) parts.push('w_' + Math.round(o.w))
  if (o.h) parts.push('h_' + Math.round(o.h))
  if (o.w || o.h) parts.push('c_' + (o.fit ?? 'limit'))
  parts.push('dpr_auto')
  return url.replace(marker, marker + parts.join(',') + '/')
}
export const cldSrcset = (url: string | null | undefined, widths: number[]) =>
  widths.map(w => `${cldUrl(url, { w })} ${w}w`).join(', ')
