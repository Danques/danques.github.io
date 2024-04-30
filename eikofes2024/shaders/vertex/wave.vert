precision mediump float;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

uniform float u_time;

attribute vec2 uv;
attribute vec3 position;

varying vec2 vUV;

void main(){
    vUV = uv;
    vec4 model_position = modelMatrix * vec4(position, 1.0);
    model_position.z += 0.2 * sin(128. * length(model_position.xy) + 5. * u_time);
    vec4 view_position = viewMatrix * model_position;
    vec4 projection_position = projectionMatrix * view_position; 
    gl_Position = projection_position;
}