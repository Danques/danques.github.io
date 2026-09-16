import { applyLook } from './lookControls.js'

const LOOK_SENSITIVITY = 0.0032
const BASE_RADIUS = 45

export function createTouchControls(player, joystickBase, joystickKnob) {
    let joystickId = null
    let lookId = null
    let joystickOrigin = { x: 0, y: 0 }
    let lastLook = { x: 0, y: 0 }
    let stick = { x: 0, y: 0 }

    function isJoystickZone(clientX) {
        return clientX < window.innerWidth * 0.5
    }

    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return

        if (isJoystickZone(e.clientX) && joystickId === null) {
            joystickId = e.pointerId
            joystickOrigin = { x: e.clientX, y: e.clientY }
            joystickBase.style.left = `${e.clientX}px`
            joystickBase.style.top = `${e.clientY}px`
            joystickBase.classList.add('visible')
        } else if (!isJoystickZone(e.clientX) && lookId === null) {
            lookId = e.pointerId
            lastLook = { x: e.clientX, y: e.clientY }
        }
    })

    window.addEventListener('pointermove', (e) => {
        if (e.pointerId === joystickId) {
            const dx = e.clientX - joystickOrigin.x
            const dy = e.clientY - joystickOrigin.y
            const dist = Math.min(BASE_RADIUS, Math.hypot(dx, dy))
            const angle = Math.atan2(dy, dx)
            stick.x = (Math.cos(angle) * dist) / BASE_RADIUS
            stick.y = -(Math.sin(angle) * dist) / BASE_RADIUS
            joystickKnob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`
        } else if (e.pointerId === lookId) {
            const dx = e.clientX - lastLook.x
            const dy = e.clientY - lastLook.y
            lastLook = { x: e.clientX, y: e.clientY }
            applyLook(player, dx, dy, LOOK_SENSITIVITY)
        }
    })

    function release(e) {
        if (e.pointerId === joystickId) {
            joystickId = null
            stick = { x: 0, y: 0 }
            joystickKnob.style.transform = 'translate(0px, 0px)'
            joystickBase.classList.remove('visible')
        }
        if (e.pointerId === lookId) {
            lookId = null
        }
    }

    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)

    return {
        getMoveInput() {
            return { x: stick.x, y: stick.y }
        }
    }
}
