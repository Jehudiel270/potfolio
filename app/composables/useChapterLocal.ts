/** Avancement local (0..1) d'un chapitre pendant son séjour ; réactif au défilement, 0 sans moteur 3D. */
export function useChapterLocal(id: string) {
  const { engine, progress } = useScene()
  const local = ref(0)
  watch(progress, () => {
    const e = engine.value, m = e?.metrics.get(id as never), tm = e?.timeline?.time()
    local.value = m && tm !== undefined && m.t1 > m.t0 ? Math.min(1, Math.max(0, (tm - m.t0) / (m.t1 - m.t0))) : 0
  })
  return local
}

/** Ouvre la fiche détaillée à partir d'une clé « type:id » (HTML et 3D partagent le même chemin). */
export function useOpenItem() {
  const { content } = usePortfolioLabels()
  const detail = useDetail()
  const sound = useSound()
  return (key: string) => {
    const c = content.value; if (!c) return
    const [type, raw] = key.split(':'), id = Number(raw)
    const pick = <T extends { id: number }>(l: T[]) => l.find(x => x.id === id)
    const map = { project: c.projects, skill: c.skills, education: c.education, experience: c.experiences, certification: c.certifications, achievement: c.achievements } as const
    const data = pick((map[type as keyof typeof map] ?? []) as { id: number }[])
    if (data) { sound.play('open'); detail.open({ type, data } as never, key) }
  }
}
