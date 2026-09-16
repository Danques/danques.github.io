precision highp float;

varying vec2 vUv;

float blob(vec2 uv,vec2 center,float radius){
  float d=length(uv-center);
  return 1.-smoothstep(radius*.4,radius,d);
}

void main(void){
  float v=0.;
  v=max(v,blob(vUv,vec2(.50,.50),.05));
  v=max(v,blob(vUv,vec2(.35,.42),.045));
  v=max(v,blob(vUv,vec2(.63,.58),.05));
  v=max(v,blob(vUv,vec2(.40,.65),.04));
  v=max(v,blob(vUv,vec2(.60,.34),.045));

  float u=1.-v*.5;

  gl_FragColor=vec4(u,v,0.,1.);
}
