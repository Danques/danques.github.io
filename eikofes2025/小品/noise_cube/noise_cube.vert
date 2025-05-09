precision highp float;
uniform vec2 u_resolution;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
   vTexCoord = aTexCoord;
   vTexCoord = vTexCoord * 2.0 - 1.0;
   vTexCoord.x *= u_resolution.x / u_resolution.y;
   vec4 pos = vec4(aPosition, 1.0);
   pos.xy = pos.xy * 2.0 - 1.0;
   gl_Position = pos;
}