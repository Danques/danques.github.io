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
    return sin(u_time * 2. + 83.2621 * fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)) * 0.5 + 0.5;
}

vec2 random_fractsin_2t2(vec2 p) {
    return vec2(random_fractsin_2t1(p), random_fractsin_2t1(p + vec2(31.8512, 58.8263)));
}

float Perlin_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    vec2 grd0 = random_fractsin_2t2(i + vec2(0.0, 0.0)) * 2. - 1.;
    vec2 grd1 = random_fractsin_2t2(i + vec2(1.0, 0.0)) * 2. - 1.;
    vec2 grd2 = random_fractsin_2t2(i + vec2(0.0, 1.0)) * 2. - 1.;
    vec2 grd3 = random_fractsin_2t2(i + vec2(1.0, 1.0)) * 2. - 1.;
    vec2 dir0 = f - vec2(0.0, 0.0);
    vec2 dir1 = f - vec2(1.0, 0.0);
    vec2 dir2 = f - vec2(0.0, 1.0);
    vec2 dir3 = f - vec2(1.0, 1.0);
    
    vec4 v = vec4(
        dot(dir0, grd0),
        dot(dir1, grd1),
        dot(dir2, grd2),
        dot(dir3, grd3)
    );
    v = v * 0.5 + 0.5;
    return interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y);
}

float pow_perlin(vec2 p){
    float value = 0.0;
    float amplitude = .5;
    float period = 0.8;
    for (int i = 0; i < 8; i++) {
        p.x += sin(p.y/period+u_time);
        value += amplitude * pow(Perlin_noise(p),1.5);
        p *= 2.;
        amplitude *= .5;
    }
    return value;
}

vec3 pallete1(float t){
    vec3 a =vec3(0.5);
    vec3 b= vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.,0.33,0.67);
    return a+b*cos(2.*PI*(c*t+d)); 
}

vec3 domain_warp(vec2 p){
    vec2 q = vec2( pow_perlin(p),pow_perlin(p+vec2(4.21,7.82)));
    p+=q;
    q*=10.;
    vec2 r = vec2( pow_perlin(q),pow_perlin(q+vec2(2.15,6.32)));
    p+=r;
    r*=10.;
    vec2 s = vec2( pow_perlin(r),pow_perlin(r+vec2(7.74,3.74)));
    p+=s;
    return pallete1(pow_perlin(p));
}

void main(void) {
    vec2 p = vTexCoord;
    p *= 2.;
    gl_FragColor = vec4(domain_warp(p), 1.0);
}