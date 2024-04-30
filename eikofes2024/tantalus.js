// TODO: With value caching can I improve the performance. Nevertheless, I won't do it, for one of these days is none of these days.
const // abbr. of Constantinople
  canvas

    = document

      .
      getElementById
      (
        'can'
      )

const l_btn = document.getElementById('l')
const r_btn = document.getElementById('r')
let moving_btn = null
const move_fn = v => e => {
  if (moving_btn !== null) {
    moving_btn.innerText = moving_btn.dataset.name
    moving_btn.dataset.moving = 0
  }
  if (moving_btn !== e.target) {
    moving_btn = e.target
    e.target.innerText = 'Stop'
    e.target.dataset.moving = 1
    TantalouVX = v
  } else {
    moving_btn = null
    TantalouVX = 0
  }
}
l_btn.addEventListener('click', move_fn(-200))
r_btn.addEventListener('click', move_fn(200))

const jump_btn = document.getElementById('j')
let jumping = 0
jump_btn.addEventListener('click', _ => {
  jumping = 1 - Number.parseInt(jump_btn.dataset.jumping)
  jump_btn.innerText = jumping ? 'Stop' : 'Jump'
  jump_btn.dataset.jumping = jumping
})

window.addEventListener('keydown', e => {
  const map = { 'ArrowLeft': l_btn, 'ArrowRight': r_btn, 'Escape': moving_btn, ' ': jump_btn }
  const btn = map[e.key]
  if (btn) btn.click()
})

function convIndex(i, l) {
  i %= l
  i += (i < 0) * l
  return i
}

// convert terra index
const cti = i => convIndex(i, terra.length)
// get terra
const gt = i => terra[cti(i)][0]

const newTerra = () => [Math.random() * h / 5, null, Math.random() < 0.15]

const newWaterLevel = i => {
  const x = [gt(i), gt(i + 1)].toSorted()
  return x[0] + Math.random() * (x[1] - x[0])
}
// get water
const gw = i => {
  let level = terra[cti(i)][1]
  if (level === null) {
    if (i < TantalouThesis) {
      level = gw(i + 1)
      if (level < gt(i + 1) && gt(i) < gt(i + 1)) level = newWaterLevel(i)
    } else if (TantalouThesis < i) {
      level = gw(i - 1)
      if (level < gt(i) && gt(i + 1) < gt(i)) level = newWaterLevel(i)
    } else {
      level = h * 0.1
    }
  }
  terra[cti(i)][1] = level
  return level
}
// set water
const sw = (index, v) => {
  const original = gw(index)
  let level = v
  for (let i = index; m <= i; i--) {
    terra[cti(i)][1] = level
    if (original <= gt(i)) break
    level = Math.max(level, gt(i))
  }
  level = v
  for (let i = index + 1; i < M; i++) {
    if (original <= gt(i)) break
    level = Math.max(level, gt(i))
    terra[cti(i)][1] = level
  }
}

// shiftArray([1, 2, 3], 1) -> [3, 1, 2] index a -> a+n
function shiftArray(arr, n) {
  const o = arr.length - convIndex(n, arr.length)
  return arr.slice(o).concat(arr.slice(0, o))
}

const convY = y => h * 0.9 - y

var terra = [[0, null, false]], all_the_fruits = [], w, h, x, y, offset, m, M, epoch, prevFrame, TantalouThesis, TantalouX, TantalouY = 100, TantalouVX = 0, TantalouVY = 0;
const c = 50 // constant
const g = -1000

function updateSize() {
  h = canvas.height = Math.floor(window.innerHeight * 0.8)
  w = canvas.width = Math.floor(window.innerWidth * 0.8)
  x = w / 2
  y = h / 2
  updateIndices()
}
updateSize()

function updateIndices() {
  offset = TantalouX - x
  m = Math.floor(offset / c)
  M = Math.ceil((w + offset) / c) + 1
}

function setTantalouX(new_x) {
  TantalouX = new_x
  TantalouThesis = Math.floor(TantalouX / c)
  offset = TantalouX - x
  updateIndices()
}
setTantalouX(0);

; (onresize = () => {
  const m0 = m, M0 = M
  updateSize()

  l0 = terra.length
  l1 = Math.ceil(w / c) + 3
  if (l0 < l1) {
    const vr0 = M0 - m0 // visible range
    terra = [...Array(M0 - m0).keys()].map(i => terra[cti(m0 + i)]).concat([...Array(l1 - vr0)].map(_ => newTerra()))
    terra = shiftArray(terra, cti(m0))
  } else if (l1 < l0) {
    const vr1 = M - m
    terra = [...Array(M - m).keys()].map(i => terra[cti(m + i)]).concat([...Array(l1 - vr1)].map(_ => newTerra()))
    terra = shiftArray(terra, cti(m))
  }
}
)
  (
)

const getGroundY = (x, i) => {
  const ratio = x - i * c
  return (gt(i) * (c - ratio) + gt(i + 1) * ratio) / c
}

const ctx = canvas.getContext('2d')

const fruit_img = new Image()
fruit_img.onload = _ => {
  const fruit_width = fruit_img.width, fruit_height = fruit_img.height
  const fruit_offset = fruit_width / 2
  // constant minus fruit width, divided by two
  const cmfwdbt = (c - fruit_width) / 2
  const f = (Zeit) => {
    if (epoch === undefined) epoch = Zeit, prevFrame = Zeit
    const elapsed = (Zeit - epoch)
    const delta = (Zeit - prevFrame) / 1000
    starvation = Math.exp(-elapsed / 50000)
    ctx.fillStyle = '#4444cc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#44cc44'
    ctx.fillRect(0, h * 0.6, w, h)
    ctx.fillStyle = `#${['660000', '884444', '88aa22', '88ff00', '00ff00'][Math.floor(starvation * 4.99)]}`
    ctx.fillRect(w * 0.4, h / 20, w * 0.2 * starvation, h / 20)
    ctx.strokeRect(w * 0.4, h / 20, w * 0.2, h / 20)
    // Draw Tantalon
    const ty = convY(TantalouY)
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(x - 12, ty + 7)
    ctx.lineTo(x, ty - 13)
    ctx.lineTo(x + 12, ty + 7)
    ctx.moveTo(x, ty - 13)
    ctx.lineTo(x, ty - 42)
    ctx.moveTo(x - 15, ty - 23)
    ctx.lineTo(x, ty - 32)
    ctx.lineTo(x + 15, ty - 23)
    ctx.moveTo(x, ty - 42)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, ty - 52, 10, 0, Math.PI * 2, false)
    ctx.moveTo(x - 5, ty - 48)
    ctx.quadraticCurveTo(x, ty - 51 + starvation * 5, x + 5, ty - 48)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'black'
    ctx.fillRect(x - 5, ty - 55, 2, 2)
    ctx.fillRect(x + 3, ty - 55, 2, 2)
    // Fruit
    const remained_fruits = []
    for (const fruit of all_the_fruits) {
      const drawn_x = fruit.x - offset - fruit_offset
      const drawn_y = convY(fruit.y)
      if (drawn_x <= cmfwdbt - c || w + cmfwdbt < drawn_x) continue
      if (drawn_y <= -fruit_height || h < drawn_y) continue
      ctx.drawImage(fruit_img, drawn_x, drawn_y)
      if (fruit.vx === 0 && fruit.vy === 0) {
        const x_distance = fruit.x - TantalouX
        if (-35 <= x_distance && x_distance < 0) fruit.vx = -400
        if (0 <= x_distance && x_distance <= 35) fruit.vx = 400
      }
      fruit.x += fruit.vx * delta
      fruit.y += fruit.vy * delta
      remained_fruits.push(fruit)
    }
    all_the_fruits = remained_fruits
    // Water
    ctx.fillStyle = 'rgba(0,0,128,0.3)'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let i = m; i < M; i++) {
      ctx.lineTo(c * i - offset, convY(gw(i)))
      ctx.lineTo(c * (i + 1) - offset, convY(gw(i)))
    }
    ctx.lineTo(w, h)
    ctx.fill()
    // Terrain
    terra[cti(M)] = newTerra()
    ctx.fillStyle = '#006600'
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let i = m; i < M; i++) {
      ctx.lineTo(c * i - offset, convY(gt(i)))
      // Yield fruit
      if (terra[cti(i)][2] && i !== M - 1) {
        terra[cti(i)][2] = false
        all_the_fruits.push({
          x: c * (i + 0.5),
          y: Math.max(getGroundY(c * i + cmfwdbt, i), getGroundY(c * (i + 1) - cmfwdbt, i)) + fruit_height + 10,
          vx: 0,
          vy: 0,
        })
      }
    }
    ctx.lineTo(w, h)
    ctx.fill()
    // Update Tantalou position
    const groundY = getGroundY(TantalouX, TantalouThesis)
    setTantalouX(TantalouX + TantalouVX * delta)
    TantalouVY += g * delta
    TantalouY += TantalouVY * delta
    if (TantalouY < groundY) {
      TantalouY = groundY
      TantalouVY = jumping * 500
    }
    const max_water_level = TantalouY + 30
    if (max_water_level < gw(TantalouThesis))
      sw(TantalouThesis, max_water_level)
    prevFrame = Zeit
    requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}
fruit_img.src = "Frucht.png"
