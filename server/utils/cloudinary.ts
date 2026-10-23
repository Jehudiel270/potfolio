import { v2 as cloudinary } from 'cloudinary'
import { AppError } from '../services/errors'

export const UPLOAD_FOLDER = 'portfolio'
export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif,gif,svg'

function configured() {
  const c = env().cloudinary
  if (!c.cloudName || !c.apiKey || !c.apiSecret) throw new AppError(503, 'cloudinary_not_configured', 'Cloudinary n’est pas configuré (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).')
  cloudinary.config({ cloud_name: c.cloudName, api_key: c.apiKey, api_secret: c.apiSecret, secure: true })
  return c
}

/** Signature d'upload direct navigateur → Cloudinary. Le secret ne quitte jamais le serveur. */
export function signUpload(sub = 'general') {
  const c = configured()
  const timestamp = Math.round(Date.now() / 1000)
  const folder = `${UPLOAD_FOLDER}/${sub.replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'general'}`
  const params = { allowed_formats: ALLOWED_FORMATS, folder, timestamp }
  return { cloudName: c.cloudName, apiKey: c.apiKey, timestamp, folder, allowedFormats: ALLOWED_FORMATS, signature: cloudinary.utils.api_sign_request(params, c.apiSecret) }
}

/** Une image n'est acceptée que si elle vient de notre dossier et de notre compte Cloudinary. */
export function isOwnedAsset(publicId: string, url: string | null): boolean {
  const { cloudName } = env().cloudinary
  if (!cloudName || !publicId.startsWith(`${UPLOAD_FOLDER}/`)) return false
  return !url || url.startsWith(`https://res.cloudinary.com/${cloudName}/`)
}
export async function deleteAssets(publicIds: string[]): Promise<void> {
  configured()
  await Promise.allSettled(publicIds.filter(i => i.startsWith(`${UPLOAD_FOLDER}/`)).map(id => cloudinary.uploader.destroy(id, { invalidate: true })))
}
export const cloudinaryStatus = () => { const c = env().cloudinary; return { configured: !!(c.cloudName && c.apiKey && c.apiSecret), cloudName: c.cloudName || null } }
