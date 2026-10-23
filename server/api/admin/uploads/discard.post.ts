import { z } from 'zod'
import { releaseAssets } from '../../../services/crud'

export default defineApi(async (event) => {
  await requireAdmin(event)
  const parsed = z.object({ publicId: z.string().min(1).max(300) }).safeParse(await readJson(event))
  if (!parsed.success) throw new AppError(422, 'validation', 'Identifiant invalide.')
  // N'efface l'image que si aucune ligne ne la référence (téléversement abandonné ou remplacé avant enregistrement).
  const removed = await releaseAssets(useDb(), [parsed.data.publicId], { deleteAssets })
  return { removed }
})
