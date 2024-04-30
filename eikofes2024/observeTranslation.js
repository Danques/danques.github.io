'use strict'

const langList = {
    'amk': {
        name: '',
        msg1: '',
        msg2: '',
    },
    'deu': {
        name: 'Deutsch',
        msg1: '',
        msg2: '',
    },
    'eng': {
        name: 'English',
        msg1: 'Do you really want to translate this page?',
        msg2: 'Even though here are some pages translated with our zeal and effort?',
    },
    'hbo': {
        name: 'עִבְרִית',
        msg1: '',
        msg2: '',
    },
    'hymmnos': {
        name: 'Hymmnos',
        msg1: '',
        msg2: '',
    },
    'jpn': {
        name: '日本語',
        msg1: '翻訳…　しちゃうの？',
        msg2: 'ちゃんと訳されたページがあるのに？',
    },
    'lat': {
        name: 'Lingua Latina',
        msg1: '',
        msg2: '',
    },
    'vol': {
        name: 'Volapük',
        msg1: 'Tradutol-li jenöfo?',
        msg2: 'Do dabinons pads, kelos lezilo petradutons fa meniks?',
    },
}

const words = {
    go: {
        'faja': ['hymmnos'],
        'gehen': ['deu'],
        'go': ['eng'],
        'golön': ['vol'],
        '行く': ['jpn'],
        'ללכת': ['hbo'],
    },
    rat: {
        'karu': ['amk'],
        'mouse': ['eng'],
        'mug': ['vol'],
        'mus': ['lat'],
        'rat': ['eng', 'vol'],
        'ratte': ['deu'],
        'ねずみ': ['jpn'],
        'ネズミ': ['jpn'],
        '鼠': ['jpn'],
        'עכבר': ['hbo'],
        'עכברוש': ['hbo'],
    },
    say: {
        'dicunt': ['lat'],
        'kaiwo': ['amk'],
        'narrat': ['lat'],
        'sagen': ['deu'],
        'sagön': ['vol'],
        'say': ['eng'],
        'to tell': ['eng'],
        '言う': ['jpn'],
        'אמר': ['hbo'],
    },
}

const specimens = {
    'gehen': {
        sl: 'deu',
        dict: words.go,
    },
    'go': {
        sl: 'eng',
        dict: words.go,
    },
    'mouse': {
        sl: 'eng',
        dict: words.rat,
    },
    'rat': {
        sl: 'eng',
        dict: words.rat,
    },
    'sagen': {
        sl: 'deu',
        dict: words.say,
    },
    'say': {
        sl: 'eng',
        dict: words.say,
    },
    '言う': {
        sl: 'jpn',
        dict: words.say,
    },
    '行く': {
        sl: 'jpn',
        dict: words.go,
    },
    '鼠': {
        sl: 'jpn',
        dict: words.rat,
    },
}

const langSuffix = lang => lang == 'jpn' ? '' : `-${lang}`

const observeTranslation = ({ pageLang, langs }) => {
    document.body.translate = false

    const container = document.createElement('div')
    container.translate = true
    for (const key in specimens) {
        const elem = document.createElement('span')
        elem.lang = specimens[key].sl
        elem.innerText = key
        Object.assign(elem.style, {
            opacity: '0',
            userSelect: 'none',
            position: 'fixed',
        })
        container.append(elem)
    }

    const popup = document.createElement('div')
    Object.assign(popup.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        bottom: '0',
        right: '0',
        backgroundColor: 'rgba(0,0,0,0.2)',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
    })
    const centre = document.createElement('div')
    Object.assign(centre.style, {
        backgroundColor: 'white',
        borderColor: 'gray',
        borderRadius: '1em',
        borderStyle: 'solid',
        borderWidth: '0.3em',
        padding: '1em',
    })
    popup.append(centre)
    document.body.append(popup)
    const displayPopup = () => {
        popup.style.display = 'flex'
    }

    const langScores = Object.fromEntries(Object.entries(langList).map(([lang, _]) => [lang, 0]))
    const observer = new MutationObserver(records => {
        for (const record of records) {
            const word = specimens[record.oldValue]
            if (word === undefined) continue
            let translated = record.target.textContent
            translated = translated.trim().toLowerCase()
            console.log(record.oldValue, translated)
            const possibleLangs = word.dict[translated]
            if (possibleLangs === undefined) continue
            for (const lang of possibleLangs) {
                langScores[lang]++
            }
        }

        let timeout = null
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            const scores = Object.entries(langScores).filter(([lang, _]) => langs.includes(lang))
            scores.sort((a, b) => b[1] - a[1])
            const msgs = langList[pageLang]
            const href = location.href
            const hrefLastSlash = href.lastIndexOf('/')
            const dirname = href.slice(0, hrefLastSlash)
            let filename = href.slice(hrefLastSlash)
            if (filename[filename.length - 1] === '/') filename += 'index.html'
            let lastPeriod = filename.lastIndexOf('.')
            if (lastPeriod === -1) lastPeriod = filename.length
            const withoutExt = filename.slice(0, lastPeriod)
            const ext = filename.slice(lastPeriod)
            const newWithoutExt = withoutExt.slice(0, withoutExt.length - langSuffix(pageLang).length)
            centre.innerHTML = `<span style="font-size:2em">${msgs.msg1}</span><br>${msgs.msg2}<br>${scores.map(([lang, _]) => `<a href="${dirname + newWithoutExt + langSuffix(lang) + ext}">${langList[lang].name}</a>`).join(' ')}`
            displayPopup()
            console.log(scores)
        }, 500)
    })
    observer.observe(container, {
        subtree: true,
        characterData: true,
        characterDataOldValue: true,
    })
    document.body.insertBefore(container, document.body.firstChild)
}
