precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;
uniform sampler2D texture;
uniform float threshold;

varying vec2 vUV;

const float PI = acos(-1.);

float random_fractsin_2t1_anim_def(vec2 p, float speed){
    return sin(u_time * speed + fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 2. * PI) * 0.5 + 0.5;
}

float random_fractsin_2t1_anim_mov(vec2 p, float speed){
    return sin(u_time * speed + fract(sin(dot(p, vec2(57.5814, 91.2448))) * 58914.2040) * 2. * PI) * 0.5 + 0.5;
}

float block_noise_def(vec2 p){
    return random_fractsin_2t1_anim_def(floor(p), 2.);
}

float block_noise_mov(vec2 p){
    return random_fractsin_2t1_anim_mov(floor(p), 5.);
}

void main() {
    const float res = 64.;
    vec2 p = vUV * res;
    vec2 fp = fract(p) - vec2(0.5);
    vec4 texColor = texture2D(texture, floor(vUV * res) / res);
    float val = 0.0;
    float edge = 0.45;
    if(abs(fp.x) <= edge && abs(fp.y) <= edge){
        float def = block_noise_def(p);
        float mov = block_noise_mov(p);
        if(max(max(texColor.r, texColor.g), texColor.b) <= threshold) val = def;
        else val = (def + mov) * 0.5;
    }
    gl_FragColor = vec4(vec3(val), 1.0);
}