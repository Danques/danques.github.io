precision highp float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

const float PI = 3.14159265;
const float angle = 60.0;

#define ITERATOR_MAX 10000

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

vec3 HSVtoRGB(vec3 hsv){
    return ((clamp(abs(fract(hsv.x+vec3(0,2,1)/3.)*6.-3.)-1.,0.,1.)-1.)*hsv.y+1.)*hsv.z;
}

float v3random(vec3 p) {
    return fract(sin(dot(p.xyz, vec3(12.9898, 78.2313, 36.7813))) * 43758.5453123 * (0.0001 / fract(u_time * 1.5)));
}

float box_distance(vec3 p){
    vec3 q = abs(p * v3rotate(vec3(u_time)));
    for(int i = 0; i < 8; i ++ ) {
        q *= v3rotate(vec3(0.1 * v3random(q)));
    }
    float scale = 1.0; 
    return length(max(q - vec3(scale / 2.), 0.0));
}

float distance_function(vec3 p) {
    float d = box_distance(p);
    return d;
}

vec3 get_normal(vec3 p) {
    float d = 0.0001;
    return normalize(vec3(
        distance_function(p + vec3(d, 0.0, 0.0)) - distance_function(p + vec3(-d, 0.0, 0.0)),
        distance_function(p + vec3(0.0, d, 0.0)) - distance_function(p + vec3(0.0, - d, 0.0)),
        distance_function(p + vec3(0.0, 0.0, d)) - distance_function(p + vec3(0.0, 0.0, - d))
    ));
}

void main(void) {
    vec2 p = vTexCoord;
    vec2 m = (u_mouse.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 color = vec3(0.);

    const float fov = angle * 0.5 * PI / 180.0;
    vec3 cam_pos = vec3(0.0, 0.0, 2.0);
    const vec3 light_dir = normalize(vec3(-1., 1., 1.));
    vec3 ray = normalize(vec3(sin(fov) * p.x, sin(fov) * p.y, - cos(fov)));
    
    float rx = (u_mouse.x * 2.0 - u_resolution.x) / u_resolution.x * PI * 2.;
    float ry = (u_mouse.y * 2.0 - u_resolution.y) / u_resolution.y * PI * 2.;
    cam_pos *= v3rotate(vec3(ry, -rx, 0.0));
    ray *= v3rotate(vec3(ry, -rx, 0.0));

    float distance = 0.0;
    vec3 ray_pos = cam_pos;
    for(int i = 0; i < 128; i ++ ) {
        distance = distance_function(ray_pos);
        ray_pos += ray * distance;
    }

    if (abs(distance) < 0.001) {
        vec3 normal = get_normal(ray_pos);
        float diff = dot(normal, light_dir);
        color =  HSVtoRGB(vec3((max(max(normal.x, normal.y), normal.z) * (sin(u_time) * 0.5 + 0.5)), 1., 1.)) * diff;
    } else {
        color = vec3(1.0);
    }
    gl_FragColor = vec4(color,1.0);
}