import * as THREE from 'three'
import { loadFragmentShaders } from './shaderLoader.js'
import { buildMuseum } from './museum.js'
import { createDesktopControls } from './controls.js'
import { createTouchControls } from './touchControls.js'

const MOVE_SPEED = 4.2

const MUSEUM_COLORS = {
    wallColor: 0xa8a49b,
    innerWallColor: 0x9d998f,
    ceilingColor: 0xa8a49b,
    floorColor: 0x8f8b81,
    artworkWallOffset: 0.2
}

const canvas = document.getElementById('scene')
const overlay = document.getElementById('overlay')
const overlayMessage = document.getElementById('overlay-message')
const joystickBase = document.getElementById('joystick-base')
const joystickKnob = document.getElementById('joystick-knob')

const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
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

let museum = null
window.__debug = { player, camera, scene, THREE, get museum() { return museum } }

function updateMovement(dt) {
    const desktopInput = desktopControls.getMoveInput()
    const touchInput = touchControls.getMoveInput()
    const x = THREE.MathUtils.clamp(desktopInput.x + touchInput.x, -1, 1)
    const y = THREE.MathUtils.clamp(desktopInput.y + touchInput.y, -1, 1)

    if (x !== 0 || y !== 0) {
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()
        const right = new THREE.Vector3(-forward.z, 0, forward.x)

        player.position.addScaledVector(forward, y * MOVE_SPEED * dt)
        player.position.addScaledVector(right, x * MOVE_SPEED * dt)
        if (!museum.hasLanded()) museum.clampPosition(player.position)
    }
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

overlay.addEventListener('click', () => {
    overlay.classList.add('hidden')
})

async function init() {
    const shaders = await loadFragmentShaders()
    museum = buildMuseum(scene, shaders, renderer, MUSEUM_COLORS)

    player.position.copy(museum.spawnPosition)
    player.yaw = museum.spawnYaw
    player.pitch = 0
    animate()
}

init()
