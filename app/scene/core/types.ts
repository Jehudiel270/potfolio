import type * as THREE from 'three'
import type gsap from 'gsap'
import type { ChapterId, SkillView } from '#shared/presets'
import type { PublicContent, DetailItem } from '#shared/types'
import type { ThemeBridge } from './theme-bridge'
import type { Quality } from './quality'

/** État d'interface partagé entre le HTML et la scène (objet réactif côté Vue, lu à chaque image par la scène). */
export interface SceneUi {
  skillView: SkillView
  skillFeatured: number | null
  skillCategory: string
  skillPage: number
  hexPageSize: number
  certCategory: string
  projectCategory: string
  projectActive: number | null
  achCategory: string
  /** Élément survolé / ciblé depuis le HTML (focus clavier, survol) et depuis la scène (pointeur). Format « type:id ». */
  focusKey: string | null
  pointerKey: string | null
}
export const defaultUi = (): SceneUi => ({ skillView: 'station', skillFeatured: null, skillCategory: '', skillPage: 0, hexPageSize: 24, certCategory: '', projectCategory: '', projectActive: null, achCategory: '', focusKey: null, pointerKey: null })

export type V3 = [number, number, number]
/** Pose de caméra en coordonnées locales du chapitre. */
export interface Pose { pos: V3, look: V3, fov?: number }
export interface Layout { aspect: number, mobile: boolean, fov: number }

export interface Pickable { key: string, kind: DetailItem['type'], id: number, world: THREE.Vector3, radiusPx: number, label: string, sub?: string }

export interface FrameCtx {
  time: number, dt: number
  /** Avancement local 0..1 pendant la phase de séjour du chapitre. */
  local: number
  /** Chapitre proche de la caméra (animations complètes) ou lointain (animations minimales). */
  near: boolean
  camera: THREE.PerspectiveCamera
  ui: SceneUi
  motion: number
  hovered: (key: string) => boolean
}

export interface ChapterDeps { theme: ThemeBridge, quality: Quality, content: PublicContent, noise: THREE.Texture }

export interface Chapter {
  id: ChapterId
  group: THREE.Group
  /** Profondeur occupée le long de −z (sert à placer les chapitres suivants). */
  depth: number
  poses(layout: Layout): Pose[]
  update(ctx: FrameCtx): void
  pickables(): Pickable[]
  /** Ajoute des interpolations propres au chapitre à la timeline principale. */
  timeline?(tl: gsap.core.Timeline, t0: number, t1: number): void
  setQuality?(q: Quality): void
  dispose(): void
}
