import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'

const N = 16384, R = 8, P = 1, KEYLEN = 64
const scrypt = (pw: string, salt: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k))))

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$')
  if (alg !== 'scrypt' || !n || !r || !p || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
/** Exigence minimale pour un mot de passe administrateur. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 11) return 'Le mot de passe doit contenir au moins 11 caractères.'
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Le mot de passe doit mélanger minuscules, majuscules et chiffres.'
  return null
}
