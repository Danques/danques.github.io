precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;
uniform sampler2D texture;
uniform float threshold;

varying vec2 vUV;

const float PI = acos(-1.);
const int oct = 16;

float random_fractsin_2t1_anim(vec2 p, float speed){
    return sin(u_time * speed + fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 2. * PI) * 0.5 + 0.5;
}

float block_noise(vec2 p){
    return random_fractsin_2t1_anim(floor(p), 0.5);
}

float block_noise_fBm(vec2 p){
    float value = 0.0;
    float amplitude = .5;

    for (int i = 0; i < oct; i++) {
        value += amplitude * abs(block_noise(p) * 2. - 1.);
        p *= 2.;
        amplitude *= .5;
    }
    return value;
}

float block_noise_fBm_recur(vec2 p){
    float value = 0.0;
    float signVal = 1.0;
    for(int i = 0; i < 4; ++i){
        value = block_noise_fBm(p + value * vec2(signVal, -signVal));
        signVal *= -1.;
    }
    return value;
}

void main() {
    const float res = 16.;
    float xGlitch = block_noise_fBm((vUV + 0.1) * res) * 2. - 1.;
    vec2 p = vUV + 0.1 * vec2(xGlitch, 0.);
    vec4 texColor = texture2D(texture, p);
    float noiseValue = 0.8 * block_noise_fBm(p * res);
    gl_FragColor = (max(max(texColor.r, texColor.g), texColor.b) + noiseValue <= threshold) ? vec4(vec3(0.0), 1.0) : vec4(0.0);
}