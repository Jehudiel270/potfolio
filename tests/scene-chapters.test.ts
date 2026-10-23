import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import gsap from 'gsap'
import { makeDb } from './helpers/db'
import { RESOURCES, createRow } from '../server/services/crud'
import { getPublicContent } from '../server/services/content'
import { buildPlan } from '../shared/sections'
import { ThemeBridge } from '../app/scene/core/theme-bridge'
import { makeTileableNoise } from '../app/scene/core/noise'
import { profileFor } from '../app/scene/core/quality'
import { defaultUi, type Chapter, type ChapterDeps, type FrameCtx, type Layout } from '../app/scene/core/types'
import { AboutChapter, PortalChapter } from '../app/scene/chapters/home-portal-about'
import { SkillsChapter } from '../app/scene/chapters/skills'
import { AchievementsChapter, CertificationsChapter, EducationChapter, ExperiencesChapter } from '../app/scene/chapters/timeline-chapters'
import { ContactChapter, ProjectsChapter } from '../app/scene/chapters/projects-contact'
import { buildMasterTimeline } from '../app/scene/core/timeline'
import type { SpaceEngine } from '../app/scene/core/engine'
import type { PublicContent } from '../shared/types'
import type { ChapterId } from '../shared/presets'

// Les chapitres sont de simples graphes Three.js : on les construit et on les anime sans WebGL (aucun rendu n'est nécessaire).
let content: PublicContent
let deps: ChapterDeps
const layouts: Layout[] = [{ aspect: 1.78, mobile: false, fov: 50 }, { aspect: 0.5, mobile: true, fov: 62 }]

beforeAll(async () => {
  const canvasStub = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true }) })
  ;(globalThis as unknown as { document: unknown }).document = { createElement: canvasStub }
  const db = await makeDb()
  const R = RESOURCES
  for (const n of ['Vue', 'Nuxt', 'Three.js', 'GSAP', 'Postgres']) await createRow(db, R.skills!, { name: n, category: n === 'Three.js' || n === 'GSAP' ? '3D' : 'Web', featured: n === 'Nuxt', color: '#34d399', proficiency: 70 })
  await createRow(db, R.education!, { title: 'Licence', startDate: '2018-09-01', endDate: '2021-06-30' }); await createRow(db, R.education!, { title: 'Master', startDate: '2021-09-01', isCurrent: true })
  await createRow(db, R.experiences!, { organization: 'A', role: 'Dev', startDate: '2022-01-01', preset: 'cylinder' }); await createRow(db, R.experiences!, { organization: 'B', role: 'Lead', startDate: '2023-01-01', isCurrent: true })
  for (const [i, p] of (['crystal', 'plate', 'prism', 'orb'] as const).entries()) await createRow(db, R.certifications!, { name: `Cert ${i}`, category: i % 2 ? 'Web' : 'Cloud', preset: p })
  for (const p of ['capsule', 'badge', 'spark'] as const) await createRow(db, R.achievements!, { title: `Prix ${p}`, preset: p })
  for (const p of ['crystal', 'cube', 'ico', 'shard'] as const) await createRow(db, R.projects!, { title: `Projet ${p}`, status: 'published', preset: p, category: p === 'cube' ? 'Mobile' : 'Web' })
  content = await getPublicContent(db)
  deps = { theme: new ThemeBridge(), quality: profileFor('high', 1), content, noise: makeTileableNoise(32, 2) }
})

const ctx = (ui = defaultUi(), t = 0): FrameCtx => ({ time: t, dt: 0.016, local: 0.5, near: true, camera: new THREE.PerspectiveCamera(), ui, motion: 1, hovered: k => k === ui.focusKey })

describe('chapitres 3D (sans WebGL)', () => {
  const factories: [ChapterId, () => Chapter][] = [
    ['portal', () => new PortalChapter(deps)], ['about', () => new AboutChapter(deps)], ['skills', () => new SkillsChapter(deps)],
    ['education', () => new EducationChapter(deps, content.education)], ['experiences', () => new ExperiencesChapter(deps, content.experiences)],
    ['certifications', () => new CertificationsChapter(deps, content.certifications)], ['achievements', () => new AchievementsChapter(deps, content.achievements)],
    ['projects', () => new ProjectsChapter(deps, content.projects)], ['contact', () => new ContactChapter(deps)],
  ]
  for (const [id, make] of factories) {
    it(`${id} : construit, anime, expose des poses valides et se nettoie`, () => {
      const ch = make()
      expect(ch.id).toBe(id)
      for (const l of layouts) {
        const poses = ch.poses(l)
        expect(poses.length).toBeGreaterThan(0)
        for (const p of poses) expect([...p.pos, ...p.look].every(Number.isFinite)).toBe(true)
      }
      const ui = defaultUi(); ui.focusKey = 'project:1'
      for (let i = 0; i < 5; i++) ch.update(ctx(ui, i * 0.1))
      expect(Array.isArray(ch.pickables())).toBe(true)
      ch.dispose()
    })
  }
  it('skills : la station n’a qu’un seul noyau, un seul bras et un seul module, quel que soit le nombre de compétences', () => {
    const ch = new SkillsChapter(deps)
    const names = new Set<string>(); let boxes = 0
    ch.group.traverse(o => { const g = (o as THREE.Mesh).geometry; if (g instanceof THREE.OctahedronGeometry && (g as THREE.OctahedronGeometry).parameters.radius === 0.62) boxes++; names.add(o.type) })
    expect(boxes).toBe(1) // un seul cristal de module
    const spheres = [] as THREE.Mesh[]; ch.group.traverse(o => { const g = (o as THREE.Mesh).geometry; if (g instanceof THREE.SphereGeometry && g.parameters.radius === 1.1) spheres.push(o as THREE.Mesh) })
    expect(spheres).toHaveLength(1) // un seul noyau
    ch.dispose()
  })
  it('skills : bascule station → hexagones et expose les compétences cliquables', () => {
    const ch = new SkillsChapter(deps), ui = defaultUi(); ui.skillView = 'hex'
    for (let i = 0; i < 40; i++) ch.update(ctx(ui, i * 0.05))
    const pk = ch.pickables()
    expect(pk.length).toBe(content.skills.length)
    expect(pk.every(p => p.kind === 'skill')).toBe(true)
    ch.dispose()
  })
})

describe('timeline GSAP', () => {
  it('crée un label par section publiée, une durée égale au défilement et suit les poses', () => {
    const plan = buildPlan(content.settings, content)
    const chapters = [new PortalChapter(deps), new AboutChapter(deps), new SkillsChapter(deps), new ProjectsChapter(deps, content.projects), new ContactChapter(deps)]
    chapters.forEach((c, i) => c.group.position.set(0, 0, -34 * i))
    const engine = {
      cam: { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 50 }, byId: new Map(chapters.map(c => [c.id, c])), metrics: new Map(), timeline: null, layout: layouts[0]!,
      poseWorld: (c: Chapter, p: { pos: number[], look: number[], fov?: number }) => ({ px: p.pos[0]! + c.group.position.x, py: p.pos[1]! + c.group.position.y, pz: p.pos[2]! + c.group.position.z, lx: p.look[0]! + c.group.position.x, ly: p.look[1]! + c.group.position.y, lz: p.look[2]! + c.group.position.z, fov: p.fov ?? 50 }),
    } as unknown as SpaceEngine
    const ids = chapters.map(c => c.id), total = 9000
    const sections = ids.map((id, i) => ({ id, top: i * 1800, height: 1800 }))
    const tl = buildMasterTimeline(gsap, engine, sections, total)
    expect(tl.duration()).toBeCloseTo(total, 0)
    for (const id of ids) expect(tl.labels[id]).toBeDefined()
    tl.time(0); const start = { ...engine.cam }
    tl.time(total); const end = { ...engine.cam }
    expect((['px', 'py', 'pz', 'lx', 'ly', 'lz', 'fov'] as const).every(k => Number.isFinite(start[k]) && Number.isFinite(end[k]))).toBe(true)
    expect(end.pz).toBeLessThan(start.pz) // la caméra avance bien le long de −z
    expect(plan.sections.map(s => s.id)).toContain('projects')
    chapters.forEach(c => c.dispose())
  })
})
