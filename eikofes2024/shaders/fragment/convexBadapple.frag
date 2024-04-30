precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;
uniform sampler2D texture;

varying vec2 vUV;

void main() {
    const float res = 64.;
    gl_FragColor = texture2D(texture, floor(vUV * res) / res);
}