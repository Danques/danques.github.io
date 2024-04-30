precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;

varying vec2 vUV;

void main() {
    gl_FragColor = vec4(vUV.x, vUV.y, sin(8. * length(u_mouse)) * 0.5 + 0.5, 0.8);
}