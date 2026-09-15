const STEP_INTERVAL = 0.42
const REVERB_DURATION = 2.2
const REVERB_DECAY = 3.2

function buildImpulseResponse(context) {
    const sampleRate = context.sampleRate
    const length = Math.floor(sampleRate * REVERB_DURATION)
    const impulse = context.createBuffer(2, length, sampleRate)

    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch)
        for (let i = 0; i < length; i++) {
            const t = i / length
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, REVERB_DECAY)
        }
    }
    return impulse
}

export function createFootstepAudio() {
    let context = null
    let convolver = null
    let dryGain = null
    let wetGain = null
    let masterGain = null
    let timeSinceStep = 0
    let stepToggle = false

    function ensureContext() {
        if (context) return
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) return

        context = new AudioContextClass()

        masterGain = context.createGain()
        masterGain.gain.value = 0.55
        masterGain.connect(context.destination)

        dryGain = context.createGain()
        dryGain.gain.value = 0.55
        dryGain.connect(masterGain)

        convolver = context.createConvolver()
        convolver.buffer = buildImpulseResponse(context)

        wetGain = context.createGain()
        wetGain.gain.value = 0.85
        convolver.connect(wetGain)
        wetGain.connect(masterGain)
    }

    function playStep() {
        if (!context) return
        const now = context.currentTime
        const pitch = 0.92 + Math.random() * 0.16
        const pan = stepToggle ? 0.12 : -0.12
        stepToggle = !stepToggle

        const panner = context.createStereoPanner ? context.createStereoPanner() : null
        if (panner) panner.pan.value = pan

        const thump = context.createOscillator()
        thump.type = 'sine'
        thump.frequency.setValueAtTime(95 * pitch, now)
        thump.frequency.exponentialRampToValueAtTime(45 * pitch, now + 0.09)

        const thumpGain = context.createGain()
        thumpGain.gain.setValueAtTime(0.0001, now)
        thumpGain.gain.exponentialRampToValueAtTime(0.9, now + 0.008)
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

        const noiseBufferSize = Math.floor(context.sampleRate * 0.12)
        const noiseBuffer = context.createBuffer(1, noiseBufferSize, context.sampleRate)
        const noiseData = noiseBuffer.getChannelData(0)
        for (let i = 0; i < noiseBufferSize; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseBufferSize)
        }
        const noise = context.createBufferSource()
        noise.buffer = noiseBuffer

        const noiseFilter = context.createBiquadFilter()
        noiseFilter.type = 'bandpass'
        noiseFilter.frequency.value = 1400 * pitch
        noiseFilter.Q.value = 0.7

        const noiseGain = context.createGain()
        noiseGain.gain.setValueAtTime(0.0001, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.004)
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07)

        thump.connect(thumpGain)
        noise.connect(noiseFilter)
        noiseFilter.connect(noiseGain)

        const destinations = panner ? [panner] : []
        const mixNode = context.createGain()
        thumpGain.connect(mixNode)
        noiseGain.connect(mixNode)

        if (panner) {
            mixNode.connect(panner)
            panner.connect(dryGain)
            panner.connect(convolver)
        } else {
            mixNode.connect(dryGain)
            mixNode.connect(convolver)
        }

        thump.start(now)
        thump.stop(now + 0.15)
        noise.start(now)
        noise.stop(now + 0.12)

        thump.onended = () => {
            thump.disconnect()
            thumpGain.disconnect()
        }
        noise.onended = () => {
            noise.disconnect()
            noiseFilter.disconnect()
            noiseGain.disconnect()
            mixNode.disconnect()
            if (panner) panner.disconnect()
        }
        void destinations
    }

    return {
        unlock() {
            ensureContext()
            if (context && context.state === 'suspended') {
                context.resume()
            }
        },
        update(dt, isMoving, rateMultiplier = 1) {
            if (!context || !isMoving) {
                timeSinceStep = 0
                return
            }
            const interval = STEP_INTERVAL / rateMultiplier
            timeSinceStep += dt
            if (timeSinceStep >= interval) {
                timeSinceStep -= interval
                playStep()
            }
        }
    }
}
