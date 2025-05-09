precision highp float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

const float PI = acos(-1.);
const float EPS = 1e-4;

const int STEP = 128;

#define ITERATOR_MAX 10000
#define saturate(x) clamp(x, 0.1, 1.0)

mat3 v3rotate(vec3 theta) {
    mat3 rx = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(theta.x), - sin(theta.x),
        0, sin(theta.x), cos(theta.x)
    );
    mat3 ry = mat3(
        cos(theta.y), 0.0, sin(theta.y),
        0.0, 1.0, 0.0,
        - sin(theta.y), 0.0, cos(theta.y)
    );
    mat3 rz = mat3(
        cos(theta.z), - sin(theta.z), 0.0,
        sin(theta.z), cos(theta.z), 0.0,
        0.0, 0.0, 1.0
    );
    return rz * ry * rx;
}

float random_fractsin_2t1_anim(vec2 p, float speed){
    return sin(u_time * speed + fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 2. * PI) * 0.5 + 0.5;
}

float block_noise(vec2 p){
    return random_fractsin_2t1_anim(floor(p), 2.);
}

float block_noise_fBm(vec2 p){
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;

    for (int i = 0; i < 4; i++) {
        value += amplitude * block_noise(p);
        p *= 2.;
        amplitude *= .5;
    }
    return value;
}

float block_noise_fBm_recur(vec2 p){
    float v = 0.;
    float plsSign = 1.;
    for(int i = 0; i < 4; ++i){
        v = block_noise_fBm(p + vec2(plsSign * v, -plsSign * v));
        p *= 2.;
        plsSign *= -1.;
    }
    return v;
}

float v3box(vec3 p, vec3 b){
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y,q.z)),0.0);
}

float distance_function(vec3 p){
    p *= v3rotate(vec3(u_time * 0.1));
    float d = 1e9;
    vec3 box = vec3(0.1, 2., 0.1) * 2.;
    float scale = 0.8;
    for(int i = 0; i < 4; ++i){
        p += 0.3 * (vec3(block_noise(p.xy), block_noise(p.yz), block_noise(p.zx)) * 2. - 1.);
        p.xz -= 2.0;
        p = abs(p);
        d = min(d, v3box(p, box * scale));
    }
    return v3box(p, box);
}

vec3 get_normal(vec3 p) {
    vec2 d = vec2(EPS, 0.);
    return normalize(vec3(
        distance_function(p + d.xyy) - distance_function(p - d.xyy),
        distance_function(p + d.yxy) - distance_function(p - d.yxy),
        distance_function(p + d.yyx) - distance_function(p - d.yyx)
    ));
}

void main(void) {
    vec2 p = vTexCoord;
    vec2 m = (u_mouse.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 color = vec3(0.);

    vec3 cam_pos = vec3(0.0, 0.0, 10.0);

    const float angle = 60.0;
    const float fov = angle * 0.5 * PI / 180.0;
    const vec3 light_dir = normalize(vec3(7., 5., 3.));

    vec3 ray = normalize(vec3(sin(fov) * p.x, sin(fov) * p.y, - cos(fov)));

    float distance = 0.0;
    vec3 ray_pos = cam_pos;
    float minimum_dist = 1e10;

    for(int i = 0; i < STEP; i++) {
        distance = distance_function(ray_pos);
        minimum_dist = min(minimum_dist, distance);
        ray_pos += 0.2 * distance * ray;
    }
    float k = 4.0;
    color = vec3(pow(30., -minimum_dist));
    gl_FragColor = vec4(color, 1.0);
}