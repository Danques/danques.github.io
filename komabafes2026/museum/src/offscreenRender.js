import * as THREE from 'three'

export function createOrthoScene() {
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1
    return { scene, camera }
}

export function createRenderTarget(width, height, options = {}) {
    return new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: false,
        stencilBuffer: false,
        ...options
    })
}

export function renderToTarget(renderer, scene, camera, target) {
    const previousTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(previousTarget)
}

export function createSolidTexture(r, g, b, a = 255) {
    const texture = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1)
    texture.needsUpdate = true
    return texture
}
