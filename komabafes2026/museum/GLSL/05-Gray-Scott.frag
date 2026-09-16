precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_state;

const vec3 COLOR_PULSE=vec3(1.,1.,1.);
const vec3 COLOR_BASE=vec3(.851,.224,.306);

const float TEXEL=1./256.;
const float RELIEF=2.4;

float heightAt(vec2 uv){
  float v=texture2D(u_state,uv).g;
  return smoothstep(.15,.55,v);
}

void main(void){
  float hC=heightAt(vUv);
  float hL=heightAt(vUv-vec2(TEXEL,0.));
  float hR=heightAt(vUv+vec2(TEXEL,0.));
  float hD=heightAt(vUv-vec2(0.,TEXEL));
  float hU=heightAt(vUv+vec2(0.,TEXEL));

  vec3 normal=normalize(vec3((hL-hR)*RELIEF,(hD-hU)*RELIEF,1.));

  vec3 lightDir=normalize(vec3(-.45,.55,.7));
  vec3 viewDir=vec3(0.,0.,1.);
  vec3 halfDir=normalize(lightDir+viewDir);

  float diffuse=max(dot(normal,lightDir),0.);
  float spec=pow(max(dot(normal,halfDir),0.),10.);
  float rim=pow(1.-max(dot(normal,viewDir),0.),2.5);

  vec3 baseColor=mix(COLOR_BASE,COLOR_PULSE,pow(hC,.6));

  vec3 color=baseColor*(.55+diffuse*.8);
  color+=mix(vec3(1.,.95,.9),COLOR_PULSE,.6)*spec*.2;
  color+=COLOR_PULSE*rim*.22*hC;
  color=mix(color,COLOR_PULSE,hC*.15);

  vec2 c=vUv-.5;
  float vign=1.-dot(c,c)*.6;
  color*=vign;

  gl_FragColor=vec4(color,1.);
}
