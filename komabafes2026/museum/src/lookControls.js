export const MAX_PITCH = Math.PI / 2 - 0.05

export function applyLook(player, dx, dy, sensitivity) {
    player.yaw -= dx * sensitivity
    player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch - dy * sensitivity))
}
