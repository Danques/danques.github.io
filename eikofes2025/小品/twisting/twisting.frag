precision highp float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

const float PI = acos(-1.);
const float EPS = 1e-4;

const int STEP = 512;

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

float v3box(vec3 p, vec3 b){
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float distance_function(vec3 p) {
    p *= v3rotate(16. * (1.- cos(0.5 * u_time)) * p);
    return v3box(p, vec3(1.));
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

    vec3 cam_pos = vec3(0.0, 0.0, 4.0);

    const float angle = 60.0;
    const float fov = angle * 0.5 * PI / 180.0;
    const vec3 light_dir = normalize(vec3(7.,6.,4.));

    vec3 ray = normalize(vec3(sin(fov) * p.x, sin(fov) * p.y, - cos(fov)));

    float rx = (u_mouse.x * 2.0-u_resolution.x) / u_resolution.x * PI * 2.;
    float ry = (u_mouse.y * 2.0-u_resolution.y) / u_resolution.y * PI * 2.;
    cam_pos *= v3rotate(vec3(ry, -rx, 0.0));
    ray *= v3rotate(vec3(ry, -rx, 0.0));

    float distance = 0.0;
    float ray_len = 0.0;
    vec3 ray_pos = cam_pos;

    for(int i = 0; i < STEP; i++) {
        distance = distance_function(ray_pos);
        ray_len += distance;
        ray_pos += distance * ray * 0.08;
    }

    if (abs(distance) < EPS) {
        vec3 normal = get_normal(ray_pos);
        color = vec3(saturate(dot(normal, light_dir)));
    }

    gl_FragColor = vec4(color,1.0);
}