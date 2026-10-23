import { describe, expect, it } from 'vitest'
import { layoutTree, neighbour } from '../app/utils/skill-tree'
import { spiralHex } from '../app/scene/chapters/common'
import { hexToLinearRgb } from '../shared/utils'
import type { PublicSkill } from '../shared/types'

const skill = (id: number, o: Partial<PublicSkill> = {}): PublicSkill => ({ id, name: `S${id}`, slug: `s${id}`, category: 'A', description: '', icon: null, iconUrl: null, color: null, proficiency: null, visible: true, featured: false, sortOrder: id, allowedModes: ['station', 'hex', 'tree'], preset: 'orb', linkedSkillIds: [], isDemo: false, ...o })

describe('arbre de compétences', () => {
  it('regroupe par catégorie sans inventer de prérequis', () => {
    const l = layoutTree([skill(1), skill(2, { category: 'B' }), skill(3)])
    expect(l.hubs.map(h => h.name).sort()).toEqual(['A', 'B'])
    expect(l.edges.every(e => e.kind === 'category')).toBe(true)
    expect(l.nodes).toHaveLength(3)
  })
  it('ne trace des liens que s’ils sont saisis et que la cible existe', () => {
    const l = layoutTree([skill(1, { linkedSkillIds: [2, 99] }), skill(2)])
    expect(l.edges.filter(e => e.kind === 'link')).toEqual([{ from: 'skill:1', to: 'skill:2', kind: 'link' }])
  })
  it('exclut les compétences non autorisées dans ce mode', () => {
    expect(layoutTree([skill(1, { allowedModes: ['hex'] })]).nodes).toHaveLength(0)
  })
  it('navigue au clavier vers le voisin le plus proche', () => {
    const nodes = layoutTree([skill(1), skill(2), skill(3)]).nodes
    const from = nodes[0]!
    const any = (['left', 'right', 'up', 'down'] as const).map(d => neighbour(nodes, from, d)).filter(Boolean)
    expect(any.length).toBeGreaterThan(0)
  })
})

describe('géométrie de la scène', () => {
  it('génère une spirale hexagonale sans doublon', () => {
    const s = spiralHex(37), keys = new Set(s.map(([q, r]) => `${q},${r}`))
    expect(s).toHaveLength(37); expect(keys.size).toBe(37); expect(s[0]).toEqual([0, 0])
  })
  it('normalise les couleurs de thème pour les shaders', () => {
    const [r, g, b] = hexToLinearRgb('#22d3ee')
    expect(r).toBeLessThan(0.05); expect(g).toBeGreaterThan(0.5); expect(b).toBeGreaterThan(0.8)
  })
})
