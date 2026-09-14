precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;

const int STEP=32;
const float PI=3.1415926;

float interpolate(float a,float b,float x){
  float f=(1.-cos(x*PI))*.5;
  return a*(1.-f)+b*f;
}

float hash13(vec3 p){
  return fract(sin(dot(p,vec3(12.9898,78.233,43.2185)))*43758.5453);
}

float lightNoise3d(vec3 p){
  vec3 i=floor(p);
  vec3 f=fract(p);
  
  float v0=hash13(i+vec3(0.,0.,0.));
  float v1=hash13(i+vec3(0.,0.,1.));
  float v2=hash13(i+vec3(0.,1.,0.));
  float v3=hash13(i+vec3(0.,1.,1.));
  float v4=hash13(i+vec3(1.,0.,0.));
  float v5=hash13(i+vec3(1.,0.,1.));
  float v6=hash13(i+vec3(1.,1.,0.));
  float v7=hash13(i+vec3(1.,1.,1.));
  
  float i1=interpolate(v0,v4,f.x);
  float i2=interpolate(v1,v5,f.x);
  float i3=interpolate(v2,v6,f.x);
  float i4=interpolate(v3,v7,f.x);
  
  float j1=interpolate(i1,i3,f.y);
  float j2=interpolate(i2,i4,f.y);
  
  return interpolate(j1,j2,f.z);
}

mat3 v3rotate(vec3 theta){
  mat3 rx=mat3(
    1.,0.,0.,
    0.,cos(theta.x),-sin(theta.x),
    0.,sin(theta.x),cos(theta.x)
  );
  mat3 ry=mat3(
    cos(theta.y),0.,sin(theta.y),
    0.,1.,0.,
    -sin(theta.y),0.,cos(theta.y)
  );
  mat3 rz=mat3(
    cos(theta.z),-sin(theta.z),0.,
    sin(theta.z),cos(theta.z),0.,
    0.,0.,1.
  );
  return rz*ry*rx;
}

vec3 get_color(vec2 p,mat3 rot,vec3 cam_pos_base){
  vec3 color=vec3(0.);
  
  float angle=60.;
  float fov=angle*.5/180.*PI;
  vec3 ray=normalize(vec3(sin(fov)*p.x,sin(fov)*p.y,-cos(fov)));
  
  vec3 cam_pos=rot*cam_pos_base;
  ray=rot*ray;
  
  vec3 ray_pos=cam_pos;
  float dist=1.;
  float j=0.;
  
  for(int i=0;i<STEP;++i){
    j+=1.;
    if(abs(dist)<1e-3)break;
    dist=(lightNoise3d(ray_pos)*2.-1.)+.3;
    ray_pos+=ray*dist*.5;
  }
  
  if(abs(dist)<1e-3){
    color+=vec3(10./j);
  }
  return color;
}

void main(void){
  vec2 p=vUv*2.-1.;
  p.x=abs(p.x);
  
  float rx=.3*PI+u_time*.2;
  float ry=.2*PI*u_time*.1;
  mat3 rot=v3rotate(vec3(ry,-rx,0.));
  vec3 cam_pos_base=vec3(0.,0.,3.);
  
  vec3 color=vec3(0.);
  float a=1.;
  
  for(int i=0;i<3;++i){
    color+=a*get_color(p,rot,cam_pos_base);
    a*=.5;
    p*=1.5;
    color-=.1*length(p);
  }
  
  gl_FragColor=vec4(1.-color,1.);
}
