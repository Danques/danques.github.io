import * as THREE from 'three'

export const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export function createArtworkMaterial(fragmentSource, resolution) {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: fragmentSource,
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: resolution }
    }
  })
}
