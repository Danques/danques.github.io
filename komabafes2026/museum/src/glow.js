import * as THREE from 'three'
import { createOrthoScene, createRenderTarget, renderToTarget } from './offscreenRender.js'

const SAMPLE_SIZE = 8

function createGlowTexture() {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

let sharedGlowTexture = null
function getGlowTexture() {
    if (!sharedGlowTexture) sharedGlowTexture = createGlowTexture()
    return sharedGlowTexture
}


export function createColorSampler(renderer) {
    const target = createRenderTarget(SAMPLE_SIZE, SAMPLE_SIZE)
    const { scene, camera } = createOrthoScene()
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    scene.add(mesh)
    const buffer = new Uint8Array(SAMPLE_SIZE * SAMPLE_SIZE * 4)

    return function sampleColor(material, out) {
        mesh.material = material
        renderToTarget(renderer, scene, camera, target)
        renderer.readRenderTargetPixels(target, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE, buffer)

        let r = 0
        let g = 0
        let b = 0
        const count = SAMPLE_SIZE * SAMPLE_SIZE
        for (let i = 0; i < count; i++) {
            r += buffer[i * 4]
            g += buffer[i * 4 + 1]
            b += buffer[i * 4 + 2]
        }
        return out.setRGB(r / count / 255, g / count / 255, b / count / 255)
    }
}

export function createArtworkGlow(group, planeSize) {
    const texture = getGlowTexture()

    const haloMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x000000,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(planeSize * 1.3, planeSize * 1.3), haloMaterial)
    halo.position.set(0, 0, -0.01)
    group.add(halo)

    const wallGlowMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
    const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(planeSize * 1.8, planeSize * 1.8), wallGlowMaterial)
    wallGlow.position.set(0, 0, -0.058)
    group.add(wallGlow)

    const light = new THREE.PointLight(0x000000, 0, 2.5, 2)
    light.position.set(0, 0, 0.4)
    group.add(light)

    const currentColor = new THREE.Color(0x000000)
    const targetColor = new THREE.Color(0x000000)

    function applyColor(color) {
        targetColor.copy(color)
    }

    function update(dt) {
        currentColor.lerp(targetColor, Math.min(1, dt * 2.5))
        haloMaterial.color.copy(currentColor)
        wallGlowMaterial.color.copy(currentColor)
        light.color.copy(currentColor)
        const luminance = currentColor.r * 0.299 + currentColor.g * 0.587 + currentColor.b * 0.114
        light.intensity = luminance * 8
    }

    return { applyColor, update }
}
