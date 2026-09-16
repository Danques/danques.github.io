import * as THREE from 'three'
import { createOrthoScene, createRenderTarget, renderToTarget } from './offscreenRender.js'

const TARGET_SIZE = 1024
const NUM_LINES = 1000
const REJECT_DIST = 0.03
const PHI = 1.61803398875

const ICOSAHEDRON_VERTS = [
    [0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI],
    [1, PHI, 0], [1, -PHI, 0], [-1, PHI, 0], [-1, -PHI, 0],
    [PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1]
]
const VERT_SCALE = 0.3

function random(x, y) {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123
    return v - Math.floor(v)
}

function buildLines() {
    const lines = []
    for (let i = 0; i < NUM_LINES; i++) {
        const a = random(i - 1, i) * 2 - 1
        const b = random(i, i + 1) * 2 - 1
        const c = random(i + 1, i + 2) * 2 - 1
        const invLen = 1 / Math.sqrt(a * a + b * b)
        lines.push({ a, b, c, invLen })
    }
    return lines
}

function rotateIcosahedronPoints(time, out) {
    const cx = Math.cos(time * 0.7), sx = Math.sin(time * 0.7)
    const cy = Math.cos(time), sy = Math.sin(time)

    for (let i = 0; i < ICOSAHEDRON_VERTS.length; i++) {
        const [vx, vy, vz] = ICOSAHEDRON_VERTS[i]
        const x0 = vx * VERT_SCALE, y0 = vy * VERT_SCALE, z0 = vz * VERT_SCALE

        const y1 = cx * y0 + sx * z0
        const z1 = -sx * y0 + cx * z0

        const x2 = cy * x0 + sy * z1
        const z2 = -sy * x0 + cy * z1

        const persp = 3 / (3 + z2)
        out[i * 2] = x2 * persp
        out[i * 2 + 1] = y1 * persp
    }
}


function clipLineToSquare(a, b, c, invLen) {
    const px = -a * c * invLen * invLen
    const py = -b * c * invLen * invLen
    const dx = -b * invLen
    const dy = a * invLen

    let tMin = -Infinity
    let tMax = Infinity

    if (dx !== 0) {
        const t1 = (-1 - px) / dx
        const t2 = (1 - px) / dx
        tMin = Math.max(tMin, Math.min(t1, t2))
        tMax = Math.min(tMax, Math.max(t1, t2))
    } else if (px < -1 || px > 1) {
        return null
    }

    if (dy !== 0) {
        const t1 = (-1 - py) / dy
        const t2 = (1 - py) / dy
        tMin = Math.max(tMin, Math.min(t1, t2))
        tMax = Math.min(tMax, Math.max(t1, t2))
    } else if (py < -1 || py > 1) {
        return null
    }

    if (tMin > tMax) return null
    return [px + tMin * dx, py + tMin * dy, px + tMax * dx, py + tMax * dy]
}

export function createIcosahedronLines(renderer) {
    const lines = buildLines()
    const icoPts = new Float32Array(24)

    const positions = new Float32Array(NUM_LINES * 2 * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setDrawRange(0, 0)

    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const lineSegments = new THREE.LineSegments(geometry, material)
    lineSegments.frustumCulled = false

    const { scene, camera } = createOrthoScene()
    scene.background = new THREE.Color(0x000000)
    scene.add(lineSegments)

    const target = createRenderTarget(TARGET_SIZE, TARGET_SIZE)

    function update(elapsed) {
        rotateIcosahedronPoints(elapsed, icoPts)

        let vertCount = 0
        for (let i = 0; i < lines.length; i++) {
            const { a, b, c, invLen } = lines[i]

            let ok = true
            for (let j = 0; j < 12; j++) {
                const dv = Math.abs(a * icoPts[j * 2] + b * icoPts[j * 2 + 1] + c) * invLen
                if (dv < REJECT_DIST) {
                    ok = false
                    break
                }
            }
            if (!ok) continue

            const seg = clipLineToSquare(a, b, c, invLen)
            if (!seg) continue

            const o = vertCount * 3
            positions[o] = seg[0]
            positions[o + 1] = seg[1]
            positions[o + 2] = 0
            positions[o + 3] = seg[2]
            positions[o + 4] = seg[3]
            positions[o + 5] = 0
            vertCount += 2
        }

        geometry.attributes.position.needsUpdate = true
        geometry.setDrawRange(0, vertCount)

        renderToTarget(renderer, scene, camera, target)
    }

    function getTexture() {
        return target.texture
    }

    function dispose() {
        target.dispose()
        geometry.dispose()
        material.dispose()
    }

    return { update, getTexture, dispose }
}
