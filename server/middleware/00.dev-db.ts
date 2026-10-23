// Mode développement hors-ligne facultatif (PF_DEV_DB=pglite) : la base embarquée est prête avant la première requête.
export default defineEventHandler(async () => { await ensureDevDb() })
