import type { Ref } from 'vue'
import type Lenis from 'lenis'

/** Instance Lenis éventuelle (définie par SceneCanvas). Sans Lenis, le défilement natif est utilisé. */
export const lenisInstance = shallowRef<Lenis | null>(null)

export function scrollToSection(id: string, opts: { focus?: boolean } = {}) {
  if (!import.meta.client) return
  const el = document.getElementById(id)
  if (!el) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY
  if (lenisInstance.value && !reduced) lenisInstance.value.scrollTo(top, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) })
  else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  history.replaceState(null, '', id === 'home' ? location.pathname + location.search : `#${id}`)
  if (opts.focus !== false) {
    const h = el.querySelector<HTMLElement>('h1, h2')
    if (h) { h.setAttribute('tabindex', '-1'); setTimeout(() => h.focus({ preventScroll: true }), reduced ? 0 : 900) }
  }
}

/** Section active (menu), indépendante de WebGL : repose sur IntersectionObserver. */
export function useActiveSection(ids: Ref<string[]>) {
  const active = ref(ids.value[0] ?? 'home')
  let io: IntersectionObserver | null = null
  const observe = () => {
    io?.disconnect()
    io = new IntersectionObserver((entries) => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (hit) active.value = hit.target.id
    }, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.01] })
    for (const id of ids.value) { const el = document.getElementById(id); if (el) io.observe(el) }
  }
  onMounted(() => { observe(); watch(ids, () => nextTick(observe)) })
  onBeforeUnmount(() => io?.disconnect())
  return active
}
