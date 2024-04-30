'use strict'

    <!--; const canvas: HTMLCanvasElement
const canvas=document.getElementById('canvas')
const ctx=canvas.getContext('2d')
const cookie=new Image
cookie.src='Cookie.png'

onresize=_ => {
    canvas.width=innerWidth
    canvas.height=innerHeight
}

onresize()

onclick=({ clientX: x, clientY: y }) => {
    if (x<cookie.width&&y<cookie.height&&ctx.getImageData(x, y, 1, 1).data[3]) {
        document.cookie=`cookieClicker${Math.random()}=${'a'.repeat(Math.floor(Math.random()*30))}`
    }
}

const updateFrame=_ => {
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    ctx.font='3rem Arial, Helvetica, sans-serif'
    ctx.strokeText(`クッキーをクリックするとCookieが増えます。現在のクッキー量：${document.cookie.length}`, 0, innerHeight-10)
    ctx.drawImage(cookie, 0, 0)

    requestAnimationFrame(updateFrame)
}

updateFrame()
