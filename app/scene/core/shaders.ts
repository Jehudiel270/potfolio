// Tous les shaders GLSL du projet (aucun import : ce fichier est aussi validé hors navigateur par `pnpm check:shaders`).
// Les couleurs reçues en uniform sont déjà converties en espace linéaire par ThemeBridge.

export interface ShaderSource { vert: string, frag: string }

const NOISE = /* glsl */`
float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`

/* ───────────── Ciel (nébuleuse) ───────────── */
export const SKY: ShaderSource = {
  vert: /* glsl */`
    varying vec3 vDir;
    void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  frag: /* glsl */`
    uniform vec3 uBg; uniform vec3 uA; uniform vec3 uB; uniform vec3 uGlow;
    uniform float uTime; uniform float uDim; uniform float uIntensity;
    varying vec3 vDir;
    ${NOISE}
    void main(){
      vec3 d = normalize(vDir); float t = uTime * 0.01;
      float n1 = fbm(d * 2.2 + vec3(t, 0.0, t * 0.7));
      float n2 = fbm(d * 4.5 - vec3(0.0, t, 0.0) + 7.0);
      vec3 colA = mix(uA, uB, uDim); vec3 colB = mix(uB, uA, uDim);
      float neb = smoothstep(0.35, 0.85, n1) * (0.35 + 0.65 * n2);
      vec3 col = uBg + colA * neb * 0.24 * uIntensity + colB * pow(n2, 3.0) * 0.13 * uIntensity;
      float band = exp(-pow(d.y * 2.2 + 0.25 * sin(d.x * 3.0), 2.0));
      col += uGlow * band * n1 * 0.05 * uIntensity;
      gl_FragColor = vec4(col, 1.0);
    }`,
}

/* ───────────── Étoiles (plusieurs profondeurs) ───────────── */
export const STARS: ShaderSource = {
  vert: /* glsl */`
    attribute vec3 aRnd;
    uniform float uTime; uniform float uPixel; uniform float uSize; uniform vec3 uGlow; uniform vec3 uB;
    varying vec3 vCol; varying float vA;
    void main(){
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aRnd.x * 1.8) + aRnd.y * 40.0);
      gl_PointSize = max(1.0, uSize * (0.45 + aRnd.z) * uPixel * tw);
      vCol = mix(vec3(1.0), mix(uGlow, uB, aRnd.x), 0.55 * step(0.65, aRnd.y));
      vA = 0.55 + 0.45 * tw;
    }`,
  frag: /* glsl */`
    varying vec3 vCol; varying float vA;
    void main(){
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = smoothstep(1.0, 0.0, d); a *= a;
      gl_FragColor = vec4(vCol * 1.6, a * vA);
    }`,
}

/* ───────────── Poussière spatiale (boîte qui suit la caméra) ───────────── */
export const DUST: ShaderSource = {
  vert: /* glsl */`
    attribute vec3 aRnd;
    uniform vec3 uCam; uniform vec3 uBox; uniform float uTime; uniform float uPixel; uniform float uSize; uniform vec3 uColor;
    varying float vA; varying vec3 vCol;
    void main(){
      vec3 drift = vec3(sin(uTime * 0.07 + aRnd.x * 6.28), cos(uTime * 0.05 + aRnd.y * 6.28), 0.0) * 1.2;
      vec3 rel = mod(position + drift - uCam + uBox * 0.5, uBox) - uBox * 0.5;
      vec4 mv = viewMatrix * vec4(rel + uCam, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = max(-mv.z, 0.1);
      gl_PointSize = clamp(uSize * uPixel * (0.4 + aRnd.z) * 22.0 / depth, 1.0, 5.0 * uPixel);
      vec3 e = abs(rel) / (uBox * 0.5);
      vA = (1.0 - smoothstep(0.7, 1.0, max(max(e.x, e.y), e.z))) * smoothstep(0.5, 3.0, depth) * (0.35 + 0.65 * aRnd.z);
      vCol = uColor;
    }`,
  frag: /* glsl */`
    varying float vA; varying vec3 vCol;
    void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vCol * 1.4, a * vA * 0.8); }`,
}

/* ───────────── Terre holographique ───────────── */
export const EARTH: ShaderSource = {
  vert: /* glsl */`
    varying vec2 vUv; varying vec3 vNormalW; varying vec3 vViewDir; varying vec3 vLocal;
    void main(){
      vUv = uv; vLocal = normalize(position);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  frag: /* glsl */`
    uniform sampler2D uMask; uniform vec2 uTexel;
    uniform vec3 uBg; uniform vec3 uPrimary; uniform vec3 uSecondary; uniform vec3 uGlow;
    uniform float uTime; uniform float uIntensity; uniform float uScan;
    varying vec2 vUv; varying vec3 vNormalW; varying vec3 vViewDir; varying vec3 vLocal;
    void main(){
      float land = texture2D(uMask, vUv).r;
      float e = abs(texture2D(uMask, vUv + vec2(uTexel.x * 1.5, 0.0)).r - land) + abs(texture2D(uMask, vUv + vec2(0.0, uTexel.y * 1.5)).r - land);
      e = clamp(e * 1.6, 0.0, 1.0);
      vec2 g = vUv * vec2(72.0, 36.0);
      vec2 gl = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(0.0001));
      float grid = 1.0 - min(min(gl.x, gl.y), 1.0);
      float ndv = max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0);
      float fres = pow(1.0 - ndv, 3.0);
      float sweepY = fract(uTime * 0.09);
      float sweep = smoothstep(0.045, 0.0, abs(vUv.y - sweepY)) * (0.35 + 0.65 * land);
      float lines = (0.5 + 0.5 * sin(vUv.y * 1100.0 - uTime * 3.0)) * uScan;
      float flick = 0.94 + 0.06 * sin(uTime * 9.0 + vLocal.y * 30.0);
      vec3 deep = mix(uBg * 2.0 + vec3(0.0, 0.004, 0.02), uSecondary * 0.05, 0.6);
      vec3 col = deep;
      col += mix(uPrimary, uGlow, 0.25) * land * (0.16 + 0.12 * lines);
      col += uGlow * e * 0.95;
      col += uPrimary * grid * (0.09 + 0.05 * land);
      col += mix(uPrimary, uSecondary, 0.5) * fres * 1.5;
      col += uGlow * sweep * 0.9;
      col *= flick * uIntensity;
      gl_FragColor = vec4(col, 1.0);
    }`,
}

export const ATMOSPHERE: ShaderSource = {
  vert: /* glsl */`
    varying vec3 vN;
    void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  frag: /* glsl */`
    uniform vec3 uColor; uniform vec3 uColor2; uniform float uIntensity;
    varying vec3 vN;
    void main(){
      float i = pow(clamp(0.74 - dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.4);
      gl_FragColor = vec4(mix(uColor, uColor2, i) * i * 2.2 * uIntensity, i);
    }`,
}

/** Points lumineux sur les continents + repère facultatif (taille variable). */
export const EARTH_POINTS: ShaderSource = {
  vert: /* glsl */`
    attribute float aRnd;
    uniform float uTime; uniform float uPixel; uniform float uSize;
    varying float vA; varying float vS;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec3 n = normalize(mat3(modelMatrix) * position);
      float facing = dot(n, normalize(cameraPosition - wp.xyz));
      gl_Position = projectionMatrix * viewMatrix * wp;
      float sweepY = fract(uTime * 0.09);
      float vLat = 1.0 - acos(clamp(position.y / length(position), -1.0, 1.0)) / 3.14159265;
      float sweep = smoothstep(0.06, 0.0, abs(vLat - sweepY));
      float tw = 0.6 + 0.4 * sin(uTime * (1.0 + aRnd * 2.0) + aRnd * 50.0);
      gl_PointSize = max(1.0, uSize * uPixel * (0.7 + aRnd * 0.6) * (1.0 + sweep * 1.4));
      vA = smoothstep(-0.05, 0.25, facing) * (0.45 + 0.55 * tw) + sweep * 0.8;
      vS = sweep;
    }`,
  frag: /* glsl */`
    uniform vec3 uColor; uniform vec3 uGlow;
    varying float vA; varying float vS;
    void main(){
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = smoothstep(1.0, 0.1, d);
      gl_FragColor = vec4(mix(uColor, uGlow, vS) * 1.7, a * vA);
    }`,
}

/** Arcs de connexion : tracé fin + impulsion lumineuse. */
export const ARC: ShaderSource = {
  vert: /* glsl */`
    attribute float aT;
    varying float vT;
    void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  frag: /* glsl */`
    uniform vec3 uColor; uniform vec3 uGlow; uniform float uTime; uniform float uPhase;
    varying float vT;
    void main(){
      float p = fract(uTime * 0.22 + uPhase);
      float pulse = smoothstep(0.16, 0.0, abs(vT - p));
      float base = 0.16 * sin(vT * 3.14159);
      gl_FragColor = vec4(mix(uColor, uGlow, pulse) * (0.9 + pulse * 2.2), base + pulse * 0.9);
    }`,
}

/** Matériau lumineux simple (anneaux, lignes, repères) : couleur uniforme + opacité. */
export const GLOW_FLAT: ShaderSource = {
  vert: /* glsl */`
    varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  frag: /* glsl */`
    uniform vec3 uColor; uniform float uOpacity; uniform float uRim;
    varying vec3 vN; varying vec3 vV;
    void main(){ float f = mix(1.0, pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5), uRim); gl_FragColor = vec4(uColor * (1.0 + f), uOpacity * (0.35 + 0.65 * f)); }`,
}

/** Noyau lumineux de la station (dégradé cyan → violet, respiration). */
export const CORE_GLOW: ShaderSource = {
  vert: GLOW_FLAT.vert,
  frag: /* glsl */`
    uniform vec3 uA; uniform vec3 uB; uniform float uTime; uniform float uBoost;
    varying vec3 vN; varying vec3 vV;
    void main(){
      float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
      float pulse = 0.85 + 0.15 * sin(uTime * 1.7);
      vec3 c = mix(uA, uB, f * 0.9 + 0.1 * sin(uTime * 0.6));
      gl_FragColor = vec4(c * (1.4 + f * 2.2) * pulse * uBoost, 1.0);
    }`,
}

/** Nœuds d'une constellation : étoile ronde avec halo et croix. Taille et éclat par point. */
export const STAR_NODES: ShaderSource = {
  vert: /* glsl */`
    attribute float aSize; attribute float aGlow; attribute vec3 aColor;
    uniform float uPixel; uniform float uTime;
    varying float vGlow; varying vec3 vCol;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      float pulse = 1.0 + 0.08 * sin(uTime * 1.6 + position.x * 3.0);
      gl_PointSize = aSize * uPixel * pulse * (300.0 / max(-mv.z, 1.0));
      vGlow = aGlow; vCol = aColor;
    }`,
  frag: /* glsl */`
    varying float vGlow; varying vec3 vCol;
    void main(){
      vec2 p = gl_PointCoord - 0.5; float d = length(p) * 2.0;
      float core = smoothstep(0.22, 0.0, d);
      float halo = pow(smoothstep(1.0, 0.0, d), 2.2);
      float cross = (smoothstep(0.05, 0.0, abs(p.x)) + smoothstep(0.05, 0.0, abs(p.y))) * smoothstep(0.5, 0.0, d) * 0.6;
      float a = clamp(core + halo * (0.5 + vGlow) + cross * vGlow, 0.0, 1.0);
      gl_FragColor = vec4(vCol * (1.2 + core * 2.5 + vGlow * 1.5), a);
    }`,
}

/** Ligne le long d'une courbe avec impulsion qui la parcourt (constellation académique, jalons). */
export const PATH_LINE: ShaderSource = ARC

/* ───────────── Portail (port GLSL du projet Godot « PortalVFX » de l'utilisateur) ───────────── */
const PORTAL_COMMON = /* glsl */`
  const float PI = 3.14159265359;
  float shapeTex(vec2 uv){ return clamp(length(uv - 0.5) * 2.0, 0.0, 1.0); } // GradientTexture2D radial : 0 au centre → 1 au bord
`
export const PORTAL: ShaderSource = {
  vert: /* glsl */`
    uniform float uOpen;
    varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vV;
    ${PORTAL_COMMON}
    void main(){
      vUv = vec2(uv.x, 1.0 - uv.y); // convention UV de Godot (origine en haut à gauche)
      float s = clamp(shapeTex(vUv) / max(uOpen, 0.001), 0.0, 1.0);
      vec3 p = position + normal * ((pow(1.0 - s, 0.2) * 2.0 - 1.0) * 0.2) * uOpen;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vN = normalMatrix * normal; vT = normalMatrix * vec3(1.0, 0.0, 0.0); vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`,
  frag: /* glsl */`
    uniform float uTime; uniform vec2 uSize; uniform sampler2D uNoise;
    uniform vec3 uPrimary; uniform vec3 uSecondary; uniform float uEmission;
    uniform float uShapeWarp; uniform float uOpen; uniform float uDensity; uniform float uEdgeSoft; uniform float uShrink;
    uniform int uLayers; uniform float uDepthAmount; uniform float uDepthMult; uniform float uFadeAmount; uniform float uFadeMult;
    uniform float uSpeed; uniform float uSpin; uniform float uInward; uniform float uBase;
    uniform int uMode; uniform bool uDither; uniform float uAlpha;
    varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vV;
    ${PORTAL_COMMON}
    float bayer4x4(vec4 frag){
      ivec2 pixel = ivec2(frag.xy); int x = pixel.x & 3; int y = pixel.y & 3; int i = x + y * 4;
      float m[16] = float[](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
      return (m[i] + 0.5) / 32.0;
    }
    vec2 to_polar(vec2 uv){ float radius = length(uv); float angle = atan(uv.x, uv.y); return vec2(angle / 2.0, radius) / PI; }
    float blend_overlay(float a, float b){ float limit = step(0.5, a); return mix(2.0 * a * b, 1.0 - 2.0 * (1.0 - a) * (1.0 - b), limit); }
    vec2 parallax(float depth, vec3 n, vec3 t, vec3 v){
      vec3 normal = normalize(n); vec3 tangent = normalize(t); vec3 bitangent = cross(normal, tangent); vec3 view = normalize(v);
      vec3 vt = vec3(dot(view, tangent), dot(view, bitangent), dot(view, normal));
      vec2 offset = (vt.xy / max(vt.z, 0.001)) * depth;
      return vec2(-offset.x, offset.y);
    }
    float sample_shape(vec2 uv, float depth){
      float dist = shapeTex(uv);
      float denom = uOpen - depth * (uShrink * 1.0);
      return denom <= 0.0001 ? 0.0 : clamp(dist / denom, 0.0, 1.0);
    }
    float sample_noise(vec2 uv, float depth, float scale){
      uv = uv * (2.0 * scale) - (1.0 * scale);
      vec2 motion = vec2(uTime) * vec2(depth + uBase, depth + uBase) * vec2(uSpin, uInward);
      motion *= uSpeed;
      uv = (to_polar(uv) + vec2(depth, 0.0)) + motion;
      uv.x *= scale;
      return texture2D(uNoise, uv).r;
    }
    void main(){
      float value = 0.0;
      vec2 uv;
      if (uSize.y < uSize.x) { float aspect = uSize.y / uSize.x; uv = ((vUv * 2.0 - 1.0) * vec2(1.0, aspect)) / 2.0 - 0.5; }
      else { float aspect = uSize.x / uSize.y; uv = ((vUv * 2.0 - 1.0) * vec2(aspect, 1.0)) / 2.0 - 0.5; }
      uv = mod(uv, vec2(1.0));
      for (int i = 0; i < 64; i++) {
        if (i >= uLayers) break;
        float t = float(i) / float(uLayers);
        float depth = t * (uDepthAmount * uDepthMult);
        vec2 par = parallax(depth, vN, vT, vV);
        vec2 circle_uv = vUv + par; vec2 noise_uv = uv + par;
        float circle = sample_shape(circle_uv, t);
        circle = clamp((circle - (0.5 - uDensity)) / (1.5 - uDensity), 0.0, 1.0);
        float noise_mult = sample_noise(noise_uv, t, 2.0);
        float noise = sample_noise(noise_uv * (1.0 - (noise_mult * uShapeWarp)), t, 1.0);
        float shaped = blend_overlay(circle, noise);
        float edge_min = mix(0.4, 0.8, 1.0 - uEdgeSoft);
        float edge_max = mix(1.0, 0.8, 1.0 - uEdgeSoft);
        shaped = smoothstep(edge_min, edge_max, shaped);
        float fade = pow(1.0 - t, (uFadeAmount * uFadeMult));
        value = max(value, shaped * fade);
      }
      float circle_value = sample_shape(vUv, 0.0);
      vec3 color = mix(uSecondary, uPrimary, value);
      float alpha = smoothstep(0.0, 0.5, 1.0 - circle_value);
      alpha = step(0.2, alpha);
      if (uMode == 2) { alpha *= 1.0 - ((1.0 - value) * 0.5); }
      if (uDither) {
        float b = bayer4x4(gl_FragCoord);
        if (alpha < b * 2.0) discard;
        color = floor(color / b);
      } else if (alpha < 0.01) discard;
      color = clamp(color, 0.0, 1.0);
      gl_FragColor = vec4(color * (1.0 + uEmission), alpha * uAlpha);
    }`,
}

export const PORTAL_GLOW: ShaderSource = {
  vert: /* glsl */`
    uniform float uOpen;
    varying vec2 vUv;
    ${PORTAL_COMMON}
    void main(){
      vUv = vec2(uv.x, 1.0 - uv.y);
      float opened = pow(uOpen, 0.5);
      float s = clamp(shapeTex(vUv) / max(uOpen, 0.001), 0.0, 1.0);
      vec3 p = position + normal * ((pow(1.0 - s, 0.2) * 2.0 - 1.5) * 0.4) * pow(uOpen, 8.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  frag: /* glsl */`
    uniform float uTime; uniform vec2 uSize; uniform sampler2D uNoise;
    uniform vec3 uPrimary; uniform vec3 uSecondary; uniform float uEmission;
    uniform float uShapeWarp; uniform float uOpen; uniform float uEdgeSoft; uniform float uSpeed;
    uniform bool uDither; uniform float uAlpha;
    varying vec2 vUv;
    ${PORTAL_COMMON}
    float bayer4x4(vec4 frag){
      ivec2 pixel = ivec2(frag.xy); int x = pixel.x & 3; int y = pixel.y & 3; int i = x + y * 4;
      float m[16] = float[](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
      return (m[i] + 0.5) / 32.0;
    }
    vec2 to_polar(vec2 uv){ float radius = length(uv); float angle = atan(uv.x, uv.y); return vec2(angle, radius) / PI; }
    float sample_shape(vec2 uv, float opened){ return clamp(shapeTex(uv) / max(opened, 0.001), 0.0, 1.0); }
    float sample_noise(vec2 uv, float scale){
      uv = uv * (2.0 * scale) - (1.0 * scale);
      vec2 motion = vec2(uTime) * vec2(0.05, 0.1); motion *= uSpeed;
      uv = to_polar(uv) + motion; uv.x *= scale;
      return texture2D(uNoise, uv).r;
    }
    void main(){
      vec2 uv;
      if (uSize.y < uSize.x) { float aspect = uSize.y / uSize.x; uv = ((vUv * 2.0 - 1.0) * vec2(1.0, aspect)) / 2.0 - 0.5; }
      else { float aspect = uSize.x / uSize.y; uv = ((vUv * 2.0 - 1.0) * vec2(aspect, 1.0)) / 2.0 - 0.5; }
      uv = mod(uv, vec2(1.0));
      float shape = 1.0 - sample_shape(vUv, pow(uOpen, 0.5));
      shape = clamp(shape * 2.4, 0.0, 1.0);
      float inner = 1.0 - sample_shape(vUv, uOpen);
      float inner_mask = pow(clamp((inner - 0.43), 0.0, 1.0), 0.5) * 1.5;
      shape -= inner_mask;
      float noise_mult = sample_noise(uv, 3.0);
      float noise = sample_noise(uv * (1.0 - (noise_mult * uShapeWarp)), 1.0);
      float glow = clamp(shape - (1.0 - noise), 0.0, 1.0);
      float edge_min = mix(0.4, 0.0, uEdgeSoft);
      float edge_max = mix(0.4, 1.0, uEdgeSoft);
      float rim = pow(clamp(inner * 2.4, 0.0, 1.0), 3.0);
      rim -= inner_mask;
      rim = clamp((rim - 0.5) / 0.45, 0.0, 1.0);
      glow += rim * 0.5;
      glow = smoothstep(edge_min, edge_max, glow);
      vec3 color = mix(uSecondary, uPrimary, glow);
      if (uDither) {
        float b = bayer4x4(gl_FragCoord);
        if (glow < b * 2.0) discard;
        color = floor(color / b);
      } else if (glow < 0.01) discard;
      gl_FragColor = vec4(clamp(color, 0.0, 1.0) * (1.0 + uEmission), glow * uAlpha);
    }`,
}

export const PORTAL_STENCIL: ShaderSource = {
  vert: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  frag: /* glsl */`
    uniform float uOpen;
    varying vec2 vUv;
    ${PORTAL_COMMON}
    void main(){
      float shape = clamp(shapeTex(vUv) / max(uOpen, 0.001), 0.0, 1.0);
      if (shape > 0.85) discard;
      gl_FragColor = vec4(0.0);
    }`,
}

/** Étincelles du portail : segments (queue → tête) émis sur l'anneau, comme le GPUParticles3D d'origine. */
export const PORTAL_SPARKS: ShaderSource = {
  vert: /* glsl */`
    attribute vec4 aData; // x: graine, y: angle, z: jitter, w: extrémité (0 = tête, 1 = queue)
    uniform float uTime; uniform float uInflow; uniform float uOpen;
    varying float vA;
    void main(){
      float life = 1.5;
      float t = fract(uTime / life + aData.x);
      float age = max(t - aData.w * 0.06, 0.0) * life;
      vec2 dir = vec2(cos(aData.y), sin(aData.y));
      float r = 1.6 + (aData.z - 0.5) * 0.08;
      float v = mix(0.8, 1.2, fract(aData.x * 7.31));
      vec3 p = vec3(dir * r, 0.5) + vec3(dir * v * age, 0.0) + vec3(0.0, 0.0, -0.5 * age * age);
      vec3 pin = vec3(dir * r * (1.0 - t), 0.5 * (1.0 - t));
      p = mix(p, pin, uInflow);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      vA = (1.0 - t) * smoothstep(0.0, 0.12, t) * (1.0 - aData.w) * clamp(uOpen, 0.0, 1.0);
    }`,
  frag: /* glsl */`
    uniform vec3 uColor;
    varying float vA;
    void main(){ gl_FragColor = vec4(uColor * 1.6, vA); }`,
}

/** Distorsion plein écran autour du portail (pincement + spirale + aberration chromatique). */
export const WARP: ShaderSource = {
  vert: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  frag: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uStrength; uniform float uAspect; uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec2 p = vUv - uCenter; p.x *= uAspect;
      float r = length(p);
      float fall = exp(-r * 2.4);
      float ang = (0.9 + 0.15 * sin(uTime * 0.7)) * fall * uStrength;
      mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      vec2 q = rot * p; q *= 1.0 - uStrength * 0.32 * fall; q.x /= uAspect;
      vec2 uv = uCenter + q;
      vec2 off = normalize(p + vec2(1e-5)) * 0.012 * fall * uStrength; off.x /= uAspect;
      float rr = texture2D(tDiffuse, uv + off).r; vec4 g = texture2D(tDiffuse, uv); float bb = texture2D(tDiffuse, uv - off).b;
      gl_FragColor = vec4(rr, g.g, bb, g.a);
    }`,
}

/** Alvéoles hexagonales (instanciées) : couleur par instance, relief et halo au survol. */
export const HEX_ATLAS: ShaderSource = {
  vert: /* glsl */`
    attribute vec4 aUvRect; attribute float aLift; attribute vec3 aTint; attribute float aAlpha;
    varying vec2 vUv; varying vec3 vTint; varying float vLift; varying float vAlpha;
    void main(){
      vUv = aUvRect.xy + uv * aUvRect.zw; vTint = aTint; vLift = aLift; vAlpha = aAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`,
  frag: /* glsl */`
    uniform sampler2D uAtlas;
    varying vec2 vUv; varying vec3 vTint; varying float vLift; varying float vAlpha;
    void main(){
      vec4 t = texture2D(uAtlas, vUv);
      vec3 c = vTint * 0.45 + t.rgb * (0.9 + vLift * 1.8);
      gl_FragColor = vec4(c * (0.9 + vLift), (t.a * 0.95 + 0.05) * vAlpha);
    }`,
}
