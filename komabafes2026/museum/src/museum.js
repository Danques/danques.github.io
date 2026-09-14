import * as THREE from 'three'
import { createArtworkMaterial } from './shaders.js'
import { createTextTexture, createDynamicTextTexture } from './textPanel.js'
import { createArtworkGlow, createColorSampler } from './glow.js'

function mod(n, m) {
    return ((n % m) + m) % m
}

function angleOf(x, z) {
    return Math.atan2(-z, x)
}

const CELL_SIZE = 2
const WALL_HEIGHT = 100
const EYE_HEIGHT = 1.6
const ARTWORK_Y = EYE_HEIGHT
const COLLISION_MARGIN = 0.6
const PLANE_SIZE = 2.2
const HOLE_RATIO = 0.1
const SHAFT_DEPTH = 1.6
const TEXT_HEIGHT = 2.0;

const CORRIDOR_N = 9

const WALL_COLOR = 0xa8a49b
const INNER_WALL_COLOR = 0xa8a49b
const CEILING_COLOR = 0x000000
const FLOOR_COLOR = 0xa8a49b

function buildRingCells(N, cellSize) {
    const half = (N - 1) / 2
    const coords = []
    for (let c = 0; c < N; c++) coords.push([c, 0])
    for (let r = 1; r < N; r++) coords.push([N - 1, r])
    for (let c = N - 2; c >= 0; c--) coords.push([c, N - 1])
    for (let r = N - 2; r >= 1; r--) coords.push([0, r])

    return coords.map(([col, row], index) => {
        const x = (col - half) * cellSize
        const z = (row - half) * cellSize
        const isCorner = (col === 0 || col === N - 1) && (row === 0 || row === N - 1)
        return { col, row, x, z, isCorner, isLight: index % 4 === 0 }
    })
}

function buildOuterShell(Ro, wallHeight, wallColor, ceilingColor) {
    const group = new THREE.Group()
    const wallMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92, metalness: 0 })
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 0.92, metalness: 0 })

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(Ro * 2, Ro * 2), ceilingMaterial)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = wallHeight
    ceiling.receiveShadow = true
    group.add(ceiling)

    const wallGeometry = new THREE.PlaneGeometry(Ro * 2, wallHeight)
    const wallDefs = [
        { z: -Ro, ry: 0 },
        { z: Ro, ry: Math.PI },
        { x: Ro, ry: -Math.PI / 2 },
        { x: -Ro, ry: Math.PI / 2 }
    ]
    wallDefs.forEach(({ x = 0, z = 0, ry }) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial)
        wall.position.set(x, wallHeight / 2, z)
        wall.rotation.y = ry
        wall.receiveShadow = true
        group.add(wall)
    })

    return group
}

function outerWallInfo(cell, N, Ro) {
    if (cell.row === 0) return { x: cell.x, z: -Ro, normal: new THREE.Vector3(0, 0, 1) }
    if (cell.row === N - 1) return { x: cell.x, z: Ro, normal: new THREE.Vector3(0, 0, -1) }
    if (cell.col === 0) return { x: -Ro, z: cell.z, normal: new THREE.Vector3(1, 0, 0) }
    return { x: Ro, z: cell.z, normal: new THREE.Vector3(-1, 0, 0) }
}

function createFloorTile(cellSize, floorColor) {
    const geometry = new THREE.PlaneGeometry(cellSize, cellSize)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.85, metalness: 0.02 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    return mesh
}

function createLightFloorTile(cellSize, holeSize, floorColor) {
    const half = cellSize / 2
    const holeHalf = holeSize / 2

    const shape = new THREE.Shape()
    shape.moveTo(-half, -half)
    shape.lineTo(half, -half)
    shape.lineTo(half, half)
    shape.lineTo(-half, half)
    shape.closePath()

    const hole = new THREE.Path()
    hole.moveTo(-holeHalf, -holeHalf)
    hole.lineTo(holeHalf, -holeHalf)
    hole.lineTo(holeHalf, holeHalf)
    hole.lineTo(-holeHalf, holeHalf)
    hole.closePath()
    shape.holes.push(hole)

    const geometry = new THREE.ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    return mesh
}

function createLightWell(holeSize, shaftDepth, castShadow) {
    const group = new THREE.Group()
    const half = holeSize / 2

    const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0xeae7e0, roughness: 0.95, metalness: 0 })
    const wallGeometry = new THREE.PlaneGeometry(holeSize, shaftDepth)
    const wallDefs = [
        { z: -half, ry: 0 },
        { z: half, ry: Math.PI },
        { x: half, ry: -Math.PI / 2 },
        { x: -half, ry: Math.PI / 2 }
    ]
    wallDefs.forEach(({ x = 0, z = 0, ry }) => {
        const wall = new THREE.Mesh(wallGeometry, shaftMaterial)
        wall.position.set(x, -shaftDepth / 2, z)
        wall.rotation.y = ry
        wall.receiveShadow = true
        group.add(wall)
    })

    const glowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffe0,
        emissive: 0xffffe0,
        emissiveIntensity: 3.5,
        roughness: 0.6
    })
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(holeSize * 0.96, holeSize * 0.96), glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = -shaftDepth + 0.02
    group.add(glow)

    const light = new THREE.PointLight(0xffffe0, 16, 16, 2)
    light.position.y = -shaftDepth * 0.5
    light.castShadow = castShadow
    if (castShadow) {
        light.shadow.mapSize.set(256, 256)
        light.shadow.camera.near = 0.2
        light.shadow.camera.far = 13
        light.shadow.bias = -0.003
    }
    group.add(light)

    return group
}

function addTextPlane(group, text, options, desiredHeight, maxWidth, y, z) {
    const { texture, aspect } = createTextTexture(text, options)
    let width = desiredHeight * aspect
    let height = desiredHeight
    if (maxWidth && width > maxWidth) {
        width = maxWidth
        height = width / aspect
    }
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    )
    plane.position.set(0, y, z)
    group.add(plane)
    return plane
}

function buildArtwork(scene, x, z, normal) {
    const rotationY = Math.atan2(normal.x, normal.z)

    const group = new THREE.Group()
    group.position.set(x + normal.x * 0.06, 0, z + normal.z * 0.06)
    group.rotation.y = rotationY
    scene.add(group)

    const material = createArtworkMaterial(
        'precision mediump float;\nvoid main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }',
        new THREE.Vector2(1024, 1024)
    )
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), material)
    plane.position.set(0, ARTWORK_Y, 0)
    group.add(plane)

    const glowGroup = new THREE.Group()
    glowGroup.position.set(0, ARTWORK_Y, 0)
    group.add(glowGroup)
    const glow = createArtworkGlow(glowGroup, PLANE_SIZE)

    const labelText = createDynamicTextTexture({
        fontSize: 48,
        color: '#111111',
        background: 'rgba(255,255,255,0.85)',
        width: 640,
        height: 96
    })
    const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(PLANE_SIZE, 0.32),
        new THREE.MeshBasicMaterial({ map: labelText.texture, transparent: true })
    )
    labelPlane.position.set(0, ARTWORK_Y - PLANE_SIZE / 2 - 0.26, 0)
    group.add(labelPlane)

    function setShader(shader) {
        material.fragmentShader = shader.source
        material.needsUpdate = true
        labelText.draw(shader.name.replace(/\.frag$/i, '').replace(/[-_]/g, ' '))
    }

    return { material, setShader, glow }
}

export function buildMuseum(scene, shaders, renderer, colors = {}) {
    const {
        wallColor = WALL_COLOR,
        innerWallColor = INNER_WALL_COLOR,
        ceilingColor = CEILING_COLOR,
        floorColor = FLOOR_COLOR
    } = colors
    const shaderCount = shaders.length
    const sampleColor = createColorSampler(renderer)
    const sampledColor = new THREE.Color()
    let sampleCursor = 0
    const N = CORRIDOR_N
    const Ro = (N * CELL_SIZE) / 2
    const Ri = ((N - 2) * CELL_SIZE) / 2
    const holeSize = CELL_SIZE * HOLE_RATIO

    const spawnPosition = new THREE.Vector3(0, EYE_HEIGHT, (Ri + Ro) / 2)
    const spawnAngle = angleOf(spawnPosition.x, spawnPosition.z)

    scene.fog = new THREE.Fog(0x14151a, Ro * 0.55, Ro * 2.6)

    scene.add(buildOuterShell(Ro, WALL_HEIGHT, wallColor, ceilingColor))

    const innerCore = new THREE.Mesh(
        new THREE.BoxGeometry(Ri * 2, WALL_HEIGHT, Ri * 2),
        new THREE.MeshStandardMaterial({ color: innerWallColor, roughness: 0.92, metalness: 0 })
    )
    innerCore.position.y = WALL_HEIGHT / 2
    innerCore.castShadow = true
    innerCore.receiveShadow = true
    scene.add(innerCore)

    scene.add(new THREE.HemisphereLight(0xc9d2e0, 0x201e1a, 1.0))
    scene.add(new THREE.AmbientLight(0xffffe0, 1.0))

    const floorFillLight = new THREE.DirectionalLight(0xffffe0, 0.5)
    floorFillLight.position.set(0, WALL_HEIGHT * 3, 0)
    floorFillLight.target.position.set(0, 0, 0)
    scene.add(floorFillLight)

    const titleGroup = new THREE.Group()
    addTextPlane(
        titleGroup,
        'Danques的空間',
        { fontSize: 140, color: '#111111', background: 'rgba(255,255,255,0)' },
        1.3,
        Ri * 1.5,
        TEXT_HEIGHT,
        0.03
    )
    const lapText = createDynamicTextTexture({
        fontSize: 90,
        color: '#111111',
        background: 'rgba(255,255,255,0)',
        width: 512,
        height: 160
    })
    const lapPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.5),
        new THREE.MeshBasicMaterial({ map: lapText.texture, transparent: true })
    )
    lapPlane.position.set(0, TEXT_HEIGHT - 0.85, 0.03)
    titleGroup.add(lapPlane)
    titleGroup.position.set(0, 0, Ri)
    scene.add(titleGroup)

    const LAP_MESSAGES = {
        '-5': 'そろそろ飽きましたか？',
        1: 'Hello',
        5: 'そろそろ飽きましたか？',
    }
    const messageText = createDynamicTextTexture({
        fontSize: 64,
        color: '#111111',
        background: 'rgba(255,255,255,0)',
        width: 1400,
        height: 240
    })
    const messageGroup = new THREE.Group()
    const messagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4 / messageText.aspect),
        new THREE.MeshBasicMaterial({ map: messageText.texture, transparent: true })
    )
    messagePlane.position.set(0, TEXT_HEIGHT, 0.03)
    messageGroup.add(messagePlane)
    messageGroup.position.set(0, 0, Ro)
    messageGroup.rotation.y = Math.PI
    scene.add(messageGroup)

    const ringCells = buildRingCells(N, CELL_SIZE)
    const half = (N - 1) / 2

    function isArtworkEligible(cell) {
        return cell.isLight && !cell.isCorner && cell.row !== N - 1
    }

    const spawnCellIndex = ringCells.findIndex((cell) => cell.row === N - 1 && cell.col === half)
    const total = ringCells.length
    const ccwFromSpawn = ringCells.map((_, i) => ringCells[mod(spawnCellIndex - 1 - i, total)])

    const artworkSlots = []
    if (shaderCount > 0) {
        let baseOrder = 0
        ccwFromSpawn.forEach((cell) => {
            if (isArtworkEligible(cell)) {
                artworkSlots.push({ cell, baseOrder })
                baseOrder += 1
            }
        })
    }
    const slotCount = artworkSlots.length

    const artworks = []
    artworkSlots.forEach(({ cell, baseOrder }) => {
        const { x, z, normal } = outerWallInfo(cell, N, Ro)
        const artwork = buildArtwork(scene, x, z, normal)
        artwork.baseOrder = baseOrder
        artwork.currentIndex = null
        artworks.push(artwork)
    })

    function applyShift(shift) {
        artworks.forEach((artwork) => {
            const index = mod(artwork.baseOrder + shift * slotCount, shaderCount)
            if (index !== artwork.currentIndex) {
                artwork.currentIndex = index
                artwork.setShader(shaders[index])
            }
        })
    }
    if (shaderCount > 0) applyShift(0)

    ringCells.forEach((cell) => {
        if (cell.isLight) {
            const tile = createLightFloorTile(CELL_SIZE, holeSize, floorColor)
            tile.position.set(cell.x, 0, cell.z)
            scene.add(tile)

            const well = createLightWell(holeSize, SHAFT_DEPTH, cell.isCorner)
            well.position.set(cell.x, 0, cell.z)
            scene.add(well)
        } else {
            const tile = createFloorTile(CELL_SIZE, floorColor)
            tile.position.set(cell.x, 0, cell.z)
            scene.add(tile)
        }
    })

    const limitOuter = Ro - COLLISION_MARGIN
    const limitInner = Ri + COLLISION_MARGIN

    function clampPosition(position) {
        position.x = THREE.MathUtils.clamp(position.x, -limitOuter, limitOuter)
        position.z = THREE.MathUtils.clamp(position.z, -limitOuter, limitOuter)

        if (Math.abs(position.x) < limitInner && Math.abs(position.z) < limitInner) {
            const pushX = limitInner - Math.abs(position.x)
            const pushZ = limitInner - Math.abs(position.z)
            if (pushX < pushZ) {
                position.x = position.x >= 0 ? limitInner : -limitInner
            } else {
                position.z = position.z >= 0 ? limitInner : -limitInner
            }
        }
    }

    const lapState = {
        lastAngle: spawnAngle,
        unwrapped: 0,
        artworkShift: 0,
        lapCount: 0,
        lastDisplay: '0',
        lastMessage: ''
    }
    lapText.draw(lapState.lastDisplay)

    function reportPosition(x, z) {
        const angle = angleOf(x, z)
        let delta = angle - lapState.lastAngle
        if (delta > Math.PI) delta -= Math.PI * 2
        else if (delta < -Math.PI) delta += Math.PI * 2
        lapState.unwrapped += delta
        lapState.lastAngle = angle

        const artworkShift = Math.floor(lapState.unwrapped / (Math.PI * 2))
        if (artworkShift !== lapState.artworkShift) {
            lapState.artworkShift = artworkShift
            if (shaderCount > 0) applyShift(artworkShift)
        }

        const lapCount = Math.round(lapState.unwrapped / (Math.PI * 2))
        if (lapCount !== lapState.lapCount) {
            lapState.lapCount = lapCount
            const display = lapCount === 0 ? '0' : lapCount > 0 ? `+${lapCount}` : `${lapCount}`
            if (display !== lapState.lastDisplay) {
                lapState.lastDisplay = display
                lapText.draw(display)
            }
            const message = LAP_MESSAGES[lapCount] || ''
            if (message !== lapState.lastMessage) {
                lapState.lastMessage = message
                messageText.draw(message)
            }
        }
    }

    return {
        spawnPosition,
        spawnYaw: 0,
        clampPosition,
        reportPosition,
        getDebug: () => ({
            unwrapped: lapState.unwrapped,
            artworkShift: lapState.artworkShift,
            lapCount: lapState.lapCount,
            lastDisplay: lapState.lastDisplay,
            slots: artworks.map((a) => ({ baseOrder: a.baseOrder, currentIndex: a.currentIndex }))
        }),
        updateTime(elapsed, dt) {
            artworks.forEach((artwork) => {
                artwork.material.uniforms.u_time.value = elapsed
            })

            if (artworks.length > 0) {
                sampleCursor = (sampleCursor + 1) % artworks.length
                const artwork = artworks[sampleCursor]
                sampleColor(artwork.material, sampledColor)
                artwork.glow.applyColor(sampledColor)
            }

            artworks.forEach((artwork) => {
                artwork.glow.update(dt)
            })
        }
    }
}
