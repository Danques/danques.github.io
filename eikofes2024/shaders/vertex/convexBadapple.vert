precision mediump float;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

uniform sampler2D texture;
uniform float threshold;

uniform float u_time;

attribute vec2 uv;
attribute vec3 position;

varying vec2 vUV;

void main(){
    float res = 64.;
    vUV = uv;
    vec4 texColor = texture2D(texture, floor(uv * res) / res);
    vec4 model_position = modelMatrix * vec4(position, 1.0);
    model_position.z += (max(max(texColor.r, texColor.g), texColor.b) <= threshold) ? -0.5 : 0.5;
    vec4 view_position = viewMatrix * model_position;
    vec4 projection_position = projectionMatrix * view_position; 
    gl_Position = projection_position;
}