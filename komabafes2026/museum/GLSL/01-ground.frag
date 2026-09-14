precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;

const float PI=3.1415926;

float interpolate(float a,float b,float x){
  float f=(1.-cos(x*PI))*.5;
  return a*(1.-f)+b*f;
}

float random_fractsin_2t1(vec2 p){
  return sin(u_time*.9+83.2621*fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453))*.5+.5;
}

float block_noise(vec2 p){
  const float res=4.;
  p=floor(p*res)/res;
  return random_fractsin_2t1(p);
}

vec3 pallete1(float t){
  vec3 a=vec3(.5,.5,.5);
  vec3 b=vec3(.5,.5,.5);
  vec3 c=vec3(1.,1.,1.);
  vec3 d=vec3(.0,.1,.2);
  return a+b*cos(2.*PI*(c*t+d));
}

vec2 warp_coord(vec2 p){
  vec2 q=vec2(block_noise(p),block_noise(p+vec2(29.21,38.91)));
  p+=q;
  p*=.8;
  return p;
}

float terrainHeight(vec2 xz){
  return block_noise(warp_coord(xz*.5))*1.5;
}

vec3 terrainColor(vec2 xz){
  return pallete1(block_noise(warp_coord(xz*.5))*.7);
}

float map(vec3 p){
  return p.y-terrainHeight(p.xz);
}

vec3 calcNormal(vec3 p){
  vec2 e=vec2(.02,0.);
  return normalize(vec3(
      map(p-e.xyy)-map(p+e.xyy),
      2.*e.x,
      map(p-e.yyx)-map(p+e.yyx)
    ));
  }
  
  float raymarch(vec3 ro,vec3 rd,out vec3 hitPos){
    float t=0.;
    for(int i=0;i<96;i++){
      vec3 p=ro+rd*t;
      float d=map(p);
      if(d<.01){
        hitPos=p;
        return t;
      }
      t+=clamp(d*.5,.02,.5);
      if(t>40.)break;
    }
    hitPos=ro+rd*t;
    return-1.;
  }
  
  void main(void){
    vec2 uv=vUv;
    
    float ang=.8*2.*PI;
    float height=3.;
    
    vec3 ro=vec3(sin(ang)*6.,height,cos(ang)*6.);
    vec3 target=vec3(0.,-3.,0.);
    
    vec3 fwd=normalize(target-ro);
    vec3 right=normalize(cross(vec3(0.,1.,0.),fwd));
    vec3 up=cross(fwd,right);
    
    vec3 rd=normalize(fwd*1.5+uv.x*right+uv.y*up);
    
    vec3 hitPos;
    float t=raymarch(ro,rd,hitPos);
    
    vec3 col;
    if(t>0.){
      vec3 n=calcNormal(hitPos);
      vec3 base=terrainColor(hitPos.xz);
      
      vec3 lightDir=normalize(vec3(.5,.8,.3));
      float ambient=.55;
      float diff=max(dot(n,lightDir),0.);
      float spec=pow(max(dot(reflect(-lightDir,n),-rd),0.),24.);
      
      col=base*(ambient+diff*1.)+vec3(1.)*spec*.6;
      
      float fog=exp(-.015*t*t);
      col=mix(vec3(.75,.8,.9),col,fog);
    }else{
      col=mix(vec3(.6,.7,.85),vec3(.85,.9,1.),uv.y+.5);
    }
    
    gl_FragColor=vec4(col,1.);
  }