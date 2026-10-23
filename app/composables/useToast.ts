export interface Toast { id: number, kind: 'ok' | 'error' | 'info', text: string }
let seq = 0
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const push = (kind: Toast['kind'], text: string, ms = 4500) => {
    const id = ++seq
    toasts.value = [...toasts.value, { id, kind, text }]
    if (import.meta.client) setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, ms)
  }
  return { toasts, ok: (t: string) => push('ok', t), error: (t: string) => push('error', t, 8000), info: (t: string) => push('info', t) }
}
