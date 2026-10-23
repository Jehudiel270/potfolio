import type { Pickable, SceneUi } from '~/scene/core/types'
import { defaultUi } from '~/scene/core/types'
import type { SpaceEngine } from '~/scene/core/engine'

/** Instance du moteur (client uniquement ; jamais sérialisée dans le payload SSR). */
const engine = shallowRef<SpaceEngine | null>(null)

export type SceneStatus = 'idle' | 'loading' | 'ready' | 'fallback'

export function useScene() {
  const ui = useState<SceneUi>('scene-ui', defaultUi)
  const status = useState<SceneStatus>('scene-status', () => 'idle')
  const crossed = useState<boolean>('scene-crossed', () => false)
  const hover = useState<Pick<Pickable, 'key' | 'label' | 'sub'> | null>('scene-hover', () => null)
  const lite = useState<boolean>('pf-lite', () => false)
  const progress = useState<number>('scene-progress', () => 0)
  return { engine, ui, status, crossed, hover, lite, progress }
}

/** Enregistre un élément HTML comme ancre projetée sur une position 3D (suivi à chaque image par le moteur). */
export function useSceneAnchor(el: Ref<HTMLElement | null>, world: () => import('three').Vector3 | null, chapter: import('#shared/presets').ChapterId | null, offset: { dx?: number, dy?: number } = {}) {
  const { engine } = useScene()
  let remove: (() => void) | null = null
  const bind = () => { remove?.(); remove = null; if (engine.value && el.value) remove = engine.value.addAnchor({ el: el.value, world, chapter, ...offset }) }
  onMounted(() => watch([engine, el], bind, { immediate: true, flush: 'post' }))
  onBeforeUnmount(() => remove?.())
}
