import * as THREE from 'three'

export function createTextTexture(text, options = {}) {
  const {
    fontSize = 64,
    color = '#111111',
    background = 'rgba(255,255,255,0)',
    fontFamily = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif"
  } = options

  const measure = document.createElement('canvas').getContext('2d')
  measure.font = `bold ${fontSize}px ${fontFamily}`
  const textWidth = measure.measureText(text).width

  const padding = fontSize * 0.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(textWidth + padding * 2)
  canvas.height = Math.ceil(fontSize * 1.7)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace

  return { texture, aspect: canvas.width / canvas.height }
}

export function createDynamicTextTexture(options = {}) {
  const {
    fontSize = 64,
    color = '#111111',
    background = 'rgba(255,255,255,0)',
    fontFamily = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
    width = 512,
    height = 160
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  function draw(text) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    texture.needsUpdate = true
  }

  return { texture, draw, aspect: width / height }
}
