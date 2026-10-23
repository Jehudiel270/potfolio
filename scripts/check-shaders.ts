// Validation hors navigateur des shaders GLSL avec glslangValidator (si installé) : `pnpm check:shaders`
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as S from '../app/scene/core/shaders'

if (spawnSync('glslangValidator', ['--version']).status !== 0) { console.log('glslangValidator absent : validation ignorée (sudo apt install glslang-tools).'); process.exit(0) }
const dir = mkdtempSync(join(tmpdir(), 'glsl-'))
const common = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform mat4 modelMatrix; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat4 viewMatrix; uniform mat4 instanceMatrix; uniform mat3 normalMatrix; uniform vec3 cameraPosition;
#define texture2D texture
`
let failed = 0, count = 0
for (const [name, src] of Object.entries(S)) {
  if (!src || typeof src !== 'object' || !('vert' in src)) continue
  count++
  count++
  const v = common + 'in vec3 position; in vec3 normal; in vec2 uv; in vec3 aRnd1;\n' + src.vert.replace(/\battribute\b/g, 'in').replace(/\bvarying\b/g, 'out')
  const f = common + 'out vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n' + src.frag.replace(/\bvarying\b/g, 'in')
  for (const [stage, code] of [['vert', v], ['frag', f]] as const) {
    const file = join(dir, `${name}.${stage}`)
    writeFileSync(file, code)
    try { execFileSync('glslangValidator', [file], { stdio: 'pipe' }) } catch (e) {
      failed++; console.error(`✖ ${name}.${stage}\n${(e as { stdout?: Buffer }).stdout?.toString() ?? e}`)
    }
  }
}
if (failed) process.exit(1)
console.log(`✔ ${count} shaders GLSL valides (vertex + fragment).`)
