const insertCookieBanner=e => {
    if (document.cookie.indexOf('noCookieClicker')+1)return
    const banner=document.createElement('div')
    banner.id='qazwsxedcrfvtgbyhnujmikolp'
    Object.assign(banner.style, {
        position: 'fixed',
        left: '5rem',
        right: '5rem',
        bottom: '0',
        border: '2px solid gray',
        borderBottomStyle: 'none',
        backgroundImage: 'url(ColourfulCookies.png)',
    })
    const d=new Date
    d.setDate(d.getDate()+1)
    banner.innerHTML = `<img src="img/クッキー食べたい.PNG"/><span style="background-color:rgba(255,255,255,0.6)">我々は別にCookie🍪を使用しませんが、この子はしきりにほしがっています。<a href="cookie-clicker.html">あげる</a> <a href="javascript:(()=>{document.getElementById('${banner.id}').remove();document.cookie='noCookieClicker=;expires=${d.toUTCString()}'})()">あげない</a></span>`
    e.append(banner)
}