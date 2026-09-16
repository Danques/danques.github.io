import * as THREE from 'three'

const SIM_SIZE = 256
const STEPS_PER_FRAME = 10
const DIFFUSION_U = 0.16
const DIFFUSION_V = 0.08
const SIM_DT = 1.0


const FEED_MIN = 0.020
const FEED_MAX = 0.022
const FEED_CENTER = (FEED_MIN + FEED_MAX) / 2
const FEED_AMPLITUDE = (FEED_MAX - FEED_MIN) / 2
const FEED_PULSE_PERIOD_SECONDS = 0.55
const KILL_BASE = 0.05

const NOISE_AMOUNT = 0.006

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

async function loadShader(path) {
    const res = await fetch(path, { cache: 'no-store' })
    return res.text()
}

export async function createReactionDiffusion(renderer) {
    const [stepSource, initSource] = await Promise.all([
        loadShader('./GLSL/_Gray-Scott-step.frag'),
        loadShader('./GLSL/_Gray-Scott-init.frag')
    ])

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    scene.add(quad)

    function makeTarget() {
        return new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, {
            type: THREE.HalfFloatType,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false
        })
    }

    let targetA = makeTarget()
    let targetB = makeTarget()

    const stepMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: stepSource,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            u_prevState: { value: null },
            u_texel: { value: new THREE.Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) },
            u_feed: { value: FEED_CENTER },
            u_kill: { value: KILL_BASE },
            u_du: { value: DIFFUSION_U },
            u_dv: { value: DIFFUSION_V },
            u_dt: { value: SIM_DT },
            u_noiseSeed: { value: 0 },
            u_noiseAmount: { value: NOISE_AMOUNT }
        }
    })

    const initMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: initSource,
        depthTest: false,
        depthWrite: false
    })

    function renderTo(material, target) {
        quad.material = material
        renderer.setRenderTarget(target)
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)
    }

    renderTo(initMaterial, targetA)
    renderTo(initMaterial, targetB)

    let stepCount = 0
    let elapsed = 0

    function swapTargets() {
        const tmp = targetA
        targetA = targetB
        targetB = tmp
    }

    function step(dt) {
        elapsed += dt
        const progress = (elapsed / FEED_PULSE_PERIOD_SECONDS) % 1;
        const triangle = Math.abs(progress - 0.5) * 4 - 1;
        stepMaterial.uniforms.u_feed.value = FEED_CENTER + FEED_AMPLITUDE * triangle;

        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            stepCount += 1
            stepMaterial.uniforms.u_noiseSeed.value = stepCount * 0.0173
            stepMaterial.uniforms.u_prevState.value = targetA.texture
            renderTo(stepMaterial, targetB)
            swapTargets()
        }
    }

    function getTexture() {
        return targetA.texture
    }

    function dispose() {
        targetA.dispose()
        targetB.dispose()
        stepMaterial.dispose()
        initMaterial.dispose()
        quad.geometry.dispose()
    }

    return { step, getTexture, dispose }
}
