precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

const int oct = 8;
const float per = 0.5;
const float PI = 3.1415926;

float interpolate(float a, float b, float x) {
    float f = (1.0 - cos(x * PI)) * 0.5;
    return a * (1.0 - f) + b * f;
}

float random_fractsin_2t1(vec2 p) {
    return sin(u_time * 0.9 + 83.2621 * fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)) * 0.5 + 0.5;
}

float block_noise(vec2 p){
    const float res = 4.;
    const float threshold = 0.4;
    p = floor(p*res)/res;
    return random_fractsin_2t1(p);
}

vec3 pallete1(float t){
    vec3 a =vec3(0.5529, 0.3412, 0.1137);
    vec3 b = vec3(0.498, 0.3961, 0.5922);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.,0.1,0.2);
    return a+b*cos(2.*PI*(c*t+d)); 
}

vec3 domain_warp(vec2 p){
    vec2 q = vec2(block_noise(p),block_noise(p+vec2(29.21,38.91)));
    p+=q;
    p*=0.8;
    return pallete1(block_noise(p)*0.7);
}

void main(void) {
    vec2 p = vTexCoord;
    gl_FragColor = vec4(domain_warp(p), 1.0);
}