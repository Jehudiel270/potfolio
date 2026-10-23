import type { PublicSkill } from '#shared/types'

export interface TreeNode { key: string, x: number, y: number, skill: PublicSkill }
export interface TreeHub { key: string, name: string, x: number, y: number }
export interface TreeEdge { from: string, to: string, kind: 'category' | 'link' }
export interface TreeLayout { nodes: TreeNode[], hubs: TreeHub[], edges: TreeEdge[], width: number, height: number }

/**
 * Disposition de l'arbre de compétences : les catégories sont des moyeux, les compétences rayonnent autour.
 * Les branches « lien » proviennent uniquement des relations saisies dans l'administration ; rien n'est déduit ni inventé.
 */
export function layoutTree(skills: PublicSkill[], width = 960, height = 620): TreeLayout {
  const list = skills.filter(s => s.allowedModes.includes('tree'))
  const cats = [...new Set(list.map(s => s.category || 'Autres'))]
  const cx = width / 2, cy = height / 2
  const hubs: TreeHub[] = [], nodes: TreeNode[] = [], edges: TreeEdge[] = []
  cats.forEach((cat, ci) => {
    const ang = cats.length === 1 ? -Math.PI / 2 : -Math.PI / 2 + (ci / cats.length) * Math.PI * 2
    const R = cats.length === 1 ? 0 : Math.min(width, height) * 0.27
    const hx = cx + Math.cos(ang) * R, hy = cy + Math.sin(ang) * R
    const hub: TreeHub = { key: `hub:${ci}`, name: cat, x: hx, y: hy }
    hubs.push(hub)
    const members = list.filter(s => (s.category || 'Autres') === cat)
    const perRing = 7
    members.forEach((s, k) => {
      const ring = Math.floor(k / perRing), idx = k % perRing, count = Math.min(perRing, members.length - ring * perRing)
      const spread = cats.length === 1 ? Math.PI * 2 : Math.min(Math.PI * 1.5, 0.62 * count + 0.4)
      const base = cats.length === 1 ? -Math.PI / 2 : ang
      const a = count === 1 ? base : base - spread / 2 + (idx / (count - 1)) * spread + (cats.length === 1 ? 0 : 0)
      const r = 92 + ring * 78
      const node: TreeNode = { key: `skill:${s.id}`, x: hx + Math.cos(a) * r, y: hy + Math.sin(a) * r, skill: s }
      nodes.push(node); edges.push({ from: hub.key, to: node.key, kind: 'category' })
    })
  })
  const byId = new Map(nodes.map(n => [n.skill.id, n]))
  for (const n of nodes) for (const to of n.skill.linkedSkillIds) { const t = byId.get(to); if (t) edges.push({ from: n.key, to: t.key, kind: 'link' }) }
  return { nodes, hubs, edges, width, height }
}

/** Voisin le plus proche dans une direction (navigation aux flèches du clavier). */
export function neighbour(nodes: TreeNode[], from: TreeNode, dir: 'left' | 'right' | 'up' | 'down'): TreeNode | null {
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]
  let best: TreeNode | null = null, score = Infinity
  for (const n of nodes) {
    if (n === from) continue
    const dx = n.x - from.x, dy = n.y - from.y, along = dx * v[0]! + dy * v[1]!
    if (along <= 1) continue
    const side = Math.abs(dx * v[1]! - dy * v[0]!), s = along + side * 1.6
    if (s < score) { score = s; best = n }
  }
  return best
}
