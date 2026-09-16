import { applyLook } from './lookControls.js'

const LOOK_SENSITIVITY = 0.0022

export function createDesktopControls(domElement, player) {
    const keys = new Set()
    let pointerLocked = false

    domElement.addEventListener('click', () => {
        if (document.pointerLockElement !== domElement) {
            domElement.requestPointerLock()
        }
    })

    document.addEventListener('pointerlockchange', () => {
        pointerLocked = document.pointerLockElement === domElement
    })

    window.addEventListener('keydown', (e) => keys.add(e.code))
    window.addEventListener('keyup', (e) => keys.delete(e.code))

    window.addEventListener('mousemove', (e) => {
        if (!pointerLocked) return
        applyLook(player, e.movementX, e.movementY, LOOK_SENSITIVITY)
    })

    return {
        getMoveInput() {
            let x = 0
            let y = 0
            if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1
            if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1
            if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
            if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
            return { x, y }
        },
        isSprinting() {
            return keys.has('ShiftLeft') || keys.has('ShiftRight')
        }
    }
}
