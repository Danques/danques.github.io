precision highp float;

varying vec2 vUv;
uniform sampler2D u_prevState;
uniform vec2 u_texel;
uniform float u_feed;
uniform float u_kill;
uniform float u_du;
uniform float u_dv;
uniform float u_dt;
uniform float u_noiseSeed;
uniform float u_noiseAmount;

float hash(vec2 p){
  return fract(sin(dot(p,vec2(12.9898,78.233))+u_noiseSeed*37.719)*43758.5453);
}

void main(void){
  vec2 uv=vUv;

  vec2 c=texture2D(u_prevState,uv).rg;
  vec2 n=texture2D(u_prevState,uv+vec2(0.,u_texel.y)).rg;
  vec2 s=texture2D(u_prevState,uv-vec2(0.,u_texel.y)).rg;
  vec2 e=texture2D(u_prevState,uv+vec2(u_texel.x,0.)).rg;
  vec2 w=texture2D(u_prevState,uv-vec2(u_texel.x,0.)).rg;
  vec2 ne=texture2D(u_prevState,uv+vec2(u_texel.x,u_texel.y)).rg;
  vec2 nw=texture2D(u_prevState,uv+vec2(-u_texel.x,u_texel.y)).rg;
  vec2 se=texture2D(u_prevState,uv+vec2(u_texel.x,-u_texel.y)).rg;
  vec2 sw=texture2D(u_prevState,uv+vec2(-u_texel.x,-u_texel.y)).rg;

  vec2 lap=(n+s+e+w)*.2+(ne+nw+se+sw)*.05-c;

  float u=c.x;
  float v=c.y;
  float reaction=u*v*v;

  float du=u_du*lap.x-reaction+u_feed*(1.-u);
  float dv=u_dv*lap.y+reaction-(u_feed+u_kill)*v;

  u+=du*u_dt;
  v+=dv*u_dt;

  vec2 texCoord=floor(uv/u_texel);
  float jitter=(hash(texCoord)-.5)*u_noiseAmount;
  v=clamp(v+jitter,0.,1.);

  gl_FragColor=vec4(clamp(u,0.,1.),v,0.,1.);
}
