import * as THREE from 'three'

/** Bruit de valeur périodique (tuilable) fractal → texture 8 bits. Remplace le placeholder de bruit du projet Godot. */
export function makeTileableNoise(size = 256, octaves = 4, seed = 7): THREE.DataTexture {
  const rand = (x: number, y: number, o: number) => {
    let h = (x * 374761393 + y * 668265263 + o * 2147483647 + seed * 1274126177) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16
    return (h >>> 0) / 4294967295
  }
  const data = new Uint8Array(size * size * 4)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.5, total = 0
    for (let o = 0; o < octaves; o++) {
      const cells = 4 << o
      const fx = (x / size) * cells, fy = (y / size) * cells
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0)
      const a = rand(x0 % cells, y0 % cells, o), b = rand((x0 + 1) % cells, y0 % cells, o)
      const c = rand(x0 % cells, (y0 + 1) % cells, o), d = rand((x0 + 1) % cells, (y0 + 1) % cells, o)
      v += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty); total += amp; amp *= 0.5
    }
    const n = Math.min(255, Math.max(0, Math.round((v / total) * 255)))
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = n; data[i + 3] = 255
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true
  return t
}

export interface LandMask { texture: THREE.CanvasTexture, width: number, height: number, isLand: (lat: number, lon: number) => boolean }

/**
 * Masque des continents (projection équirectangulaire) dessiné à partir de Natural Earth 110m (domaine public, paquet « world-atlas »).
 * Aucune texture externe à charger ni licence à gérer.
 */
export async function makeLandMask(width = 2048): Promise<LandMask> {
  const [{ feature }, topo] = await Promise.all([import('topojson-client'), import('world-atlas/land-110m.json')])
  const world = topo.default as unknown as { objects: { land: never } }
  const land = feature(world as never, world.objects.land) as unknown as { type: string, features?: { geometry: Geo }[], geometry?: Geo }
  type Geo = { type: 'Polygon' | 'MultiPolygon', coordinates: number[][][] | number[][][][] }
  const geoms: Geo[] = land.features ? land.features.map(f => f.geometry) : [land.geometry!]
  const height = width / 2
  const cv = document.createElement('canvas'); cv.width = width; cv.height = height
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  const X = (lon: number) => ((lon + 180) / 360) * width, Y = (lat: number) => ((90 - lat) / 180) * height
  const ring = (r: number[][]) => { r.forEach(([lon, lat], i) => (i ? ctx.lineTo(X(lon!), Y(lat!)) : ctx.moveTo(X(lon!), Y(lat!)))); ctx.closePath() }
  for (const g of geoms) {
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][]
    for (const poly of polys) { ctx.beginPath(); poly.forEach(ring); ctx.fill('evenodd') }
  }
  const px = ctx.getImageData(0, 0, width, height).data
  const texture = new THREE.CanvasTexture(cv)
  texture.colorSpace = THREE.NoColorSpace; texture.anisotropy = 4; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter
  return {
    texture, width, height,
    isLand: (lat, lon) => px[((Math.min(height - 1, Math.max(0, Math.floor(Y(lat)))) * width) + Math.min(width - 1, Math.max(0, Math.floor(X(lon))))) * 4]! > 127,
  }
}

export const latLonToVec3 = (lat: number, lon: number, r: number, out = new THREE.Vector3()) => {
  const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon + 180)
  // Même convention que THREE.SphereGeometry (u = 0 en x négatif) pour que points et texture coïncident.
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}
