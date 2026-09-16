export async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-store' })
  return res.text()
}

export async function loadFragmentShaders() {
  const fromManifest = await tryManifest()
  if (fromManifest) return fromManifest

  const fromListing = await tryDirectoryListing()
  if (fromListing) return fromListing

  return []
}

async function tryManifest() {
  try {
    const res = await fetch('./GLSL/manifest.json', { cache: 'no-store' })
    if (!res.ok) return null
    const names = await res.json()
    if (!Array.isArray(names) || names.length === 0) return null
    return await fetchAll(names)
  } catch {
    return null
  }
}

async function tryDirectoryListing() {
  try {
    const res = await fetch('./GLSL/', { cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const names = [...doc.querySelectorAll('a')]
      .map((a) => decodeURIComponent(a.getAttribute('href') || ''))
      .filter((href) => href.toLowerCase().endsWith('.frag'))
      .map((href) => href.split('/').pop())
    const unique = [...new Set(names)]
    if (unique.length === 0) return null
    return await fetchAll(unique)
  } catch {
    return null
  }
}

async function fetchAll(names) {
  const sorted = [...names].sort()
  return Promise.all(
    sorted.map(async (name) => ({ name, source: await fetchText(`./GLSL/${name}`) }))
  )
}
