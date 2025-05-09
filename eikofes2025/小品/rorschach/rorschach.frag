precision highp float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

const int STEP = 128;
const float PI = 3.1415926;
const int oct = 8;

float interpolate(float a, float b, float x) {
    float f = (1.0 - cos(x * PI)) * 0.5;
    return a * (1.0 - f) + b * f;
}

float random_fractsin_3t1(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 43.2185))) * 43758.5453);
}

vec3 random_fractsin_3t3(vec3 p) {
    return vec3(
        random_fractsin_3t1(p),
        random_fractsin_3t1(p + vec3(31.8512, 58.8263, 15.6938)),
        random_fractsin_3t1(p + vec3(42.1947, 35.5122, 215.5788))
    );
}

float Perlin_noise_3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    vec3 grd0 = random_fractsin_3t3(i + vec3(0.0, 0.0, 0.0)) * 2. - 1.;
    vec3 grd1 = random_fractsin_3t3(i + vec3(0.0, 0.0, 1.0)) * 2. - 1.;
    vec3 grd2 = random_fractsin_3t3(i + vec3(0.0, 1.0, 0.0)) * 2. - 1.;
    vec3 grd3 = random_fractsin_3t3(i + vec3(0.0, 1.0, 1.0)) * 2. - 1.;
    vec3 grd4 = random_fractsin_3t3(i + vec3(1.0, 0.0, 0.0)) * 2. - 1.;
    vec3 grd5 = random_fractsin_3t3(i + vec3(1.0, 0.0, 1.0)) * 2. - 1.;
    vec3 grd6 = random_fractsin_3t3(i + vec3(1.0, 1.0, 0.0)) * 2. - 1.;
    vec3 grd7 = random_fractsin_3t3(i + vec3(1.0, 1.0, 1.0)) * 2. - 1.;
    vec3 dir0 = f - vec3(0.0, 0.0, 0.0);
    vec3 dir1 = f - vec3(0.0, 0.0, 1.0);
    vec3 dir2 = f - vec3(0.0, 1.0, 0.0);
    vec3 dir3 = f - vec3(0.0, 1.0, 1.0);
    vec3 dir4 = f - vec3(1.0, 0.0, 0.0);
    vec3 dir5 = f - vec3(1.0, 0.0, 1.0);
    vec3 dir6 = f - vec3(1.0, 1.0, 0.0);
    vec3 dir7 = f - vec3(1.0, 1.0, 1.0);
    
    vec4 v = vec4(
        dot(dir0, grd0),
        dot(dir1, grd1),
        dot(dir2, grd2),
        dot(dir3, grd3)
    );
    vec4 u = vec4(
        dot(dir4, grd4),
        dot(dir5, grd5),
        dot(dir6, grd6),
        dot(dir7, grd7)
    );
    v = v * 0.5 + 0.5;
    u = u * 0.5 + 0.5;
    return interpolate(interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y), interpolate(interpolate(u.x, u.y, f.x), interpolate(u.z, u.w, f.x), f.y), f.z);
}

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

vec3 get_color(vec2 p){
    vec3 color = vec3(0.);

    float angle = 60.;
    float fov = angle * 0.5 / 180. * PI;
    vec3 cam_pos = vec3(0., 0., 3.);
    vec3 ray = normalize(vec3(sin(fov) * p.x, sin(fov) * p.y, -cos(fov)));

    float rx = (u_mouse.x * 2.0-u_resolution.x) / u_resolution.x * PI * 2.;
    float ry = (u_mouse.y * 2.0-u_resolution.y) / u_resolution.y * PI * 2.;
    cam_pos *= v3rotate(vec3(ry, -rx, 0.0));
    ray *= v3rotate(vec3(ry, -rx, 0.0));

    vec3 ray_pos = cam_pos;
    float distance = 1.0;
    float j = 0.;
    for(int i = 0; i < STEP; ++i){
        j++;
        if(abs(distance) < 1e-4) break;
        distance = (Perlin_noise_3d(ray_pos) * 2. - 1.) + 0.3;
        ray_pos += ray * distance;
    }
    if(abs(distance) < 1e-4){
        color += vec3(10. / j);
    }
    return color;
}

void main(void) {
    vec2 p = vTexCoord;
    p.x = abs(p.x);
    vec3 color = vec3(0.);
    float a = 1.;
    for(int i = 0; i < 4; ++i){
        color += a * get_color(p);
        a *= 2.;
        p *= 2.;
        color -= 0.3 * length(p);
    }
    
    gl_FragColor = vec4(1. - color, 1.0);
}