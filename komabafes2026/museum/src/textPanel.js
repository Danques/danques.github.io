import * as THREE from 'three'


const TEXT_SUPERSAMPLE = 2

export function applyAnisotropy(texture, renderer) {
    if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    return texture
}

export function createTextTexture(text, options = {}) {
    const {
        fontSize = 64,
        color = '#111111',
        background = 'rgba(255,255,255,0)',
        fontFamily = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif"
    } = options

    const px = fontSize * TEXT_SUPERSAMPLE
    const measure = document.createElement('canvas').getContext('2d')
    measure.font = `bold ${px}px ${fontFamily}`
    const textWidth = measure.measureText(text).width

    const padding = px * 0.4
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(textWidth + padding * 2)
    canvas.height = Math.ceil(px * 1.7)

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = `bold ${px}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    texture.colorSpace = THREE.SRGBColorSpace

    return { texture, aspect: canvas.width / canvas.height }
}

function computeNormalMap(heightData, width, height, strength) {
    const out = new Uint8ClampedArray(width * height * 4)
    const heightAt = (x, y) => {
        x = x < 0 ? 0 : x >= width ? width - 1 : x
        y = y < 0 ? 0 : y >= height ? height - 1 : y
        return heightData[(y * width + x) * 4]
    }
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) / 255
            const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) / 255
            let nx = -dx * strength
            let ny = -dy * strength
            let nz = 1
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
            nx /= len
            ny /= len
            nz /= len
            const i = (y * width + x) * 4
            out[i] = (nx * 0.5 + 0.5) * 255
            out[i + 1] = (ny * 0.5 + 0.5) * 255
            out[i + 2] = (nz * 0.5 + 0.5) * 255
            out[i + 3] = 255
        }
    }
    return new ImageData(out, width, height)
}

const PLAQUE_FLAT_GRAY = 0x80 / 255
const PLAQUE_CARVE_GRAY = 0x1a / 255

// Builds a diffuse+alpha map, a real normal map, and a real displacement
// map, all derived from the same carved height field, so the text is
// actually pushed into the plaque's geometry (not just shaded to look like
// it is) and reads as carved from any angle, including at grazing view
// angles where a normal map alone shows no silhouette.
export function createPlaqueMaps(options = {}) {
    const {
        width = 640,
        height = 460,
        titleFontSize = 50,
        descFontSize = 34,
        fontFamily = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
        inkColor = '#2b271f',
        bevel = 5,
        normalStrength = 5,
        carveDepth = 0.015
    } = options

    const w = width * TEXT_SUPERSAMPLE
    const h = height * TEXT_SUPERSAMPLE
    const titleFS = titleFontSize * TEXT_SUPERSAMPLE
    const descFS = descFontSize * TEXT_SUPERSAMPLE
    const bev = bevel * TEXT_SUPERSAMPLE
    const normStrength = normalStrength * TEXT_SUPERSAMPLE

    const heightCanvas = document.createElement('canvas')
    heightCanvas.width = w
    heightCanvas.height = h
    const hctx = heightCanvas.getContext('2d')

    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = w
    colorCanvas.height = h
    const cctx = colorCanvas.getContext('2d')

    const normalCanvas = document.createElement('canvas')
    normalCanvas.width = w
    normalCanvas.height = h
    const nctx = normalCanvas.getContext('2d')

    const colorTexture = new THREE.CanvasTexture(colorCanvas)
    colorTexture.colorSpace = THREE.SRGBColorSpace
    const normalTexture = new THREE.CanvasTexture(normalCanvas)
    // Displacement reads the map's red channel as a plain 0-1 height value,
    // so this must stay linear/uncolor-managed like the normal map.
    const heightTexture = new THREE.CanvasTexture(heightCanvas)

    // displacement = sample*scale + bias; solved so the flat background
    // (mid-gray) lands at 0 offset and the deepest ink lands at -carveDepth.
    const displacementScale = carveDepth / (PLAQUE_FLAT_GRAY - PLAQUE_CARVE_GRAY)
    const displacementBias = -PLAQUE_FLAT_GRAY * displacementScale

    function paintShape(ctx, title, description) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const cx = w / 2
        let y = titleFS * 0.85

        ctx.font = `bold ${titleFS}px ${fontFamily}`
        ctx.fillText(title || '', cx, y)

        y += titleFS * 0.95
        const ruleHalfWidth = Math.min(w * 0.28, titleFS * 3.2)
        ctx.fillRect(cx - ruleHalfWidth, y - h * 0.004, ruleHalfWidth * 2, h * 0.008)

        y += titleFS * 0.75
        ctx.font = `${descFS}px ${fontFamily}`
        const lineHeight = descFS * 1.35
        const lines = (description || '').split('\n')
        lines.forEach((line, i) => {
            ctx.fillText(line, cx, y + i * lineHeight)
        })
    }

    function draw(title, description) {
        hctx.clearRect(0, 0, w, h)
        hctx.filter = 'none'
        hctx.fillStyle = '#808080'
        hctx.fillRect(0, 0, w, h)
        hctx.filter = `blur(${bev}px)`
        hctx.fillStyle = '#1a1a1a'
        paintShape(hctx, title, description)
        hctx.filter = 'none'

        const heightData = hctx.getImageData(0, 0, w, h).data
        nctx.putImageData(computeNormalMap(heightData, w, h, normStrength), 0, 0)
        normalTexture.needsUpdate = true
        heightTexture.needsUpdate = true

        cctx.clearRect(0, 0, w, h)
        cctx.fillStyle = inkColor
        paintShape(cctx, title, description)
        colorTexture.needsUpdate = true
    }

    return {
        colorTexture,
        normalTexture,
        heightTexture,
        displacementScale,
        displacementBias,
        draw,
        aspect: width / height
    }
}

export function createDynamicTextTexture(options = {}) {
    const {
        fontSize = 64,
        color = '#111111',
        background = 'rgba(255,255,255,0)',
        fontFamily = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
        width = 512,
        height = 160,
        lineHeight = fontSize * 1.25
    } = options

    const canvas = document.createElement('canvas')
    canvas.width = width * TEXT_SUPERSAMPLE
    canvas.height = height * TEXT_SUPERSAMPLE
    const ctx = canvas.getContext('2d')
    const px = fontSize * TEXT_SUPERSAMPLE
    const lh = lineHeight * TEXT_SUPERSAMPLE

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    function draw(text) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = `bold ${px}px ${fontFamily}`
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const lines = text.split('\n')
        const startY = canvas.height / 2 - (lh * (lines.length - 1)) / 2
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + i * lh)
        })
        texture.needsUpdate = true
    }

    return { texture, draw, aspect: width / height }
}
