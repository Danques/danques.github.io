import * as THREE from 'three'
import { loadFragmentShaders } from './shaderLoader.js'
import { buildMuseum } from './museum.js'
import { createDesktopControls } from './controls.js'
import { createTouchControls } from './touchControls.js'
import { createFootstepAudio } from './footsteps.js'
import { getAllDescriptionText } from './shaderDescriptions.js'

const MOVE_SPEED = 4.2
const SPRINT_MULTIPLIER = 1.8

const MUSEUM_COLORS = {
    wallColor: 0xa8a49b,
    innerWallColor: 0x9d998f,
    ceilingColor: 0xa8a49b,
    floorColor: 0x8f8b81,
    artworkWallOffset: 0.2,
    plaqueSegments: 250,
    carveDepth: 0.015
}

const canvas = document.getElementById('scene')
const overlay = document.getElementById('overlay')
const overlayMessage = document.getElementById('overlay-message')
const overlayStart = document.getElementById('overlay-start')
const joystickBase = document.getElementById('joystick-base')
const joystickKnob = document.getElementById('joystick-knob')

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(hover: none)').matches
if (isTouchDevice) document.body.classList.add('touch-device')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x14151a)

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200)
camera.rotation.order = 'YXZ'

const clock = new THREE.Clock()
const player = { position: new THREE.Vector3(), yaw: 0, pitch: 0 }

const desktopControls = createDesktopControls(canvas, player)
const touchControls = createTouchControls(player, joystickBase, joystickKnob)
const footstepAudio = createFootstepAudio()

let museum = null
window.__debug = { player, camera, scene, THREE, get museum() { return museum } }

function updateMovement(dt) {
    const desktopInput = desktopControls.getMoveInput()
    const touchInput = touchControls.getMoveInput()
    const x = THREE.MathUtils.clamp(desktopInput.x + touchInput.x, -1, 1)
    const y = THREE.MathUtils.clamp(desktopInput.y + touchInput.y, -1, 1)

    const isMoving = x !== 0 || y !== 0
    const isSprinting = desktopControls.isSprinting()
    const sprintFactor = isSprinting ? SPRINT_MULTIPLIER : 1
    const speed = MOVE_SPEED * sprintFactor
    if (isMoving) {
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        const right = new THREE.Vector3(-forward.z, 0, forward.x)

        player.position.addScaledVector(forward, y * speed * dt)
        player.position.addScaledVector(right, x * speed * dt)
        if (!museum.hasLanded()) museum.clampPosition(player.position)
    }
    const inputStrength = Math.min(1, Math.hypot(x, y))
    footstepAudio.update(dt, isMoving, inputStrength * sprintFactor)
}

function animate() {
    requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.1)

    camera.rotation.y = player.yaw
    camera.rotation.x = player.pitch

    if (museum.isFalling()) {
        museum.updateFall(dt, player.position)
    } else {
        updateMovement(dt)
        if (!museum.hasLanded()) {
            museum.reportPosition(player.position.x, player.position.z)
            museum.checkPit(player.position)
        }
    }
    camera.position.copy(player.position)

    museum.updateTime(clock.getElapsedTime(), dt)
    renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

overlayStart.addEventListener('click', () => {
    overlay.classList.add('hidden')
    footstepAudio.unlock()
})

// Canvas text is drawn synchronously with ctx.fillText: if a webfont
// declared in index.html hasn't finished downloading yet at that moment,
// the browser silently substitutes a fallback font for that draw and never
// redraws once the real font arrives, unlike ordinary DOM text. That race
// is what made description plaques inconsistent - some baked in the wrong
// font, some got the right one, depending on load timing. Forcing the
// exact families/weights/characters used by the plaques to finish loading
// first makes every plaque render with the same font.
async function loadPlaqueFonts() {
    if (!document.fonts) return
    const sampleText = `Danques的空間 ${getAllDescriptionText()}`
    try {
        await Promise.all([
            document.fonts.load("600 32px 'Noto Sans JP'", sampleText),
            document.fonts.load("600 32px 'Noto Sans'", sampleText),
            document.fonts.ready
        ])
    } catch {
        // Offline/blocked font request - proceed with whatever's available
        // rather than leaving the museum stuck on a blank screen forever.
    }
}

async function init() {
    const [shaders] = await Promise.all([loadFragmentShaders(), loadPlaqueFonts()])
    museum = buildMuseum(scene, shaders, renderer, MUSEUM_COLORS)

    player.position.copy(museum.spawnPosition)
    player.yaw = museum.spawnYaw
    player.pitch = 0
    animate()
}

init()
