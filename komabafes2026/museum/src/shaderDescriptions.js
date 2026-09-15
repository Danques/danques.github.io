const DESCRIPTIONS = {
    '01-ground.frag': 'Higher Ground',
    '02-Rorschach.frag': 'ロールシャッハテスト',
    '03-vortex.frag': 'ライブコーディングを改良した',
    '04-lines.frag': '正二十面体'
}

export function getShaderDescription(name) {
    return DESCRIPTIONS[name] || ''
}

export function getAllDescriptionText() {
    return Object.values(DESCRIPTIONS).join(' ')
}
