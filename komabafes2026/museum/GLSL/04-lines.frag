#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform vec2 u_resolution;
uniform float u_time;

const float PI = 3.14159265358;
const float PHI = 1.61803398875;

const int NUM_LINES = 400;
const int NUM_VERTS = 12;
const float REJECT_DIST = 0.03;
const float LINE_THRESHOLD = 0.005;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

mat3 rotateX(float t){
    float c = cos(t), s = sin(t);
    return mat3(
        1.0, 0.0, 0.0,
        0.0,   c,  -s,
        0.0,   s,   c
    );
}

mat3 rotateY(float t){
    float c = cos(t), s = sin(t);
    return mat3(
          c, 0.0,   s,
        0.0, 1.0, 0.0,
         -s, 0.0,   c
    );
}

void getIcosahedronPoints(out vec2 pts[NUM_VERTS]){
    vec3 v[NUM_VERTS];
    v[0]  = vec3( 0.,  1.,  PHI);
    v[1]  = vec3( 0.,  1., -PHI);
    v[2]  = vec3( 0., -1.,  PHI);
    v[3]  = vec3( 0., -1., -PHI);
    v[4]  = vec3( 1.,  PHI,  0.);
    v[5]  = vec3( 1., -PHI,  0.);
    v[6]  = vec3(-1.,  PHI,  0.);
    v[7]  = vec3(-1., -PHI,  0.);
    v[8]  = vec3( PHI,  0.,  1.);
    v[9]  = vec3( PHI,  0., -1.);
    v[10] = vec3(-PHI,  0.,  1.);
    v[11] = vec3(-PHI,  0., -1.);

    float scale = 0.3;
    mat3 rot = rotateX(u_time * 0.7) * rotateY(u_time);

    for(int i = 0; i < NUM_VERTS; ++i){
        vec3 p3 = rot * (v[i] * scale);
        float persp = 3.0 / (3.0 + p3.z);
        pts[i] = p3.xy * persp;
    }
}

float distfunc(vec2 p, vec2 icoPts[NUM_VERTS]){
    float d = 1e10;

    for(int i = 0; i < NUM_LINES; ++i){
        float a = random(vec2(i - 1, i)) * 2.0 - 1.0;
        float b = random(vec2(i, i + 1)) * 2.0 - 1.0;
        float c = random(vec2(i + 1, i + 2)) * 2.0 - 1.0;

        float invLen = inversesqrt(a * a + b * b);

        bool ok = true;
        for(int j = 0; j < NUM_VERTS; ++j){
            float dv = abs(a * icoPts[j].x + b * icoPts[j].y + c) * invLen;
            if(dv < REJECT_DIST){
                ok = false;
                break;
            }
        }

        if(ok){
            float dp = abs(a * p.x + b * p.y + c) * invLen;
            d = min(d, dp);
            if(d < LINE_THRESHOLD) break;
        }
    }
    return d;
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;

    vec2 icoPts[NUM_VERTS];
    getIcosahedronPoints(icoPts);

    float d = distfunc(p, icoPts);
    gl_FragColor = vec4(1.0 - vec3(step(LINE_THRESHOLD / d, 1.0)), 1.0);
}