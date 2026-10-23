const FILES = { click: 'click', latch: 'latch', open: 'open', close: 'close', portal: 'portal', hover: 'hover' } as const
export type SoundName = keyof typeof FILES

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {}

/** Sons d'interface optionnels (Kenney « RPG Audio », CC0). Désactivés par défaut ; le choix est mémorisé sur l'appareil du visiteur. */
export function useSound() {
  const enabled = useState<boolean>('pf-sound', () => false)
  if (import.meta.client && !useState<boolean>('pf-sound-init', () => false).value) {
    useState<boolean>('pf-sound-init').value = true
    try { enabled.value = localStorage.getItem('pf-sound') === '1' } catch { /* stockage indisponible */ }
  }
  function toggle() {
    enabled.value = !enabled.value
    try { localStorage.setItem('pf-sound', enabled.value ? '1' : '0') } catch { /* stockage indisponible */ }
    if (enabled.value) play('latch')
  }
  function play(name: SoundName, volume = 0.35) {
    if (!import.meta.client || !enabled.value) return
    try {
      const a = (cache[name] ??= new Audio(`/assets/audio/${FILES[name]}.mp3`))
      const node = a.paused ? a : (a.cloneNode() as HTMLAudioElement)
      node.volume = volume; node.currentTime = 0
      void node.play().catch(() => undefined)
    } catch { /* lecture impossible : on ignore */ }
  }
  return { enabled, toggle, play }
}
