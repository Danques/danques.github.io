precision mediump float;

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;

const float PI=acos(-1.);
const float TAU=2.*PI;
const float EPS=1e-4;

mat2 v2rotate(float theta){
  float c=cos(theta);
  float s=sin(theta);
  return mat2(c,-s,s,c);
}
mat3 v3rotate(vec3 theta){
  mat3 rx=mat3(
    1.,0.,0.,
    0.,cos(theta.x),-sin(theta.x),
    0,sin(theta.x),cos(theta.x)
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
float interpolate(float a,float b,float x){
  float f=(1.-cos(x*PI))*.5;
  return a*(1.-f)+b*f;
}
float random_fractsin_2t1(vec2 p){
  return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);
}
float noise_shd(vec2 p){
  return sin((u_time*.8+random_fractsin_2t1(p))*TAU)*.5+.5;
}

vec2 random_fractsin_2t2(vec2 p){
  return vec2(random_fractsin_2t1(p),random_fractsin_2t1(p+vec2(31.8512,58.8263)));
}

float Perlin_noise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  
  vec2 grd0=random_fractsin_2t2(i+vec2(0.,0.))*2.-1.;
  vec2 grd1=random_fractsin_2t2(i+vec2(1.,0.))*2.-1.;
  vec2 grd2=random_fractsin_2t2(i+vec2(0.,1.))*2.-1.;
  vec2 grd3=random_fractsin_2t2(i+vec2(1.,1.))*2.-1.;
  vec2 dir0=f-vec2(0.,0.);
  vec2 dir1=f-vec2(1.,0.);
  vec2 dir2=f-vec2(0.,1.);
  vec2 dir3=f-vec2(1.,1.);
  
  vec4 v=vec4(
    dot(dir0,grd0),
    dot(dir1,grd1),
    dot(dir2,grd2),
    dot(dir3,grd3)
  );
  v=v*.5+.5;
  return interpolate(interpolate(v.x,v.y,f.x),interpolate(v.z,v.w,f.x),f.y);
}

vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d)
{
  return a+b*cos(TAU*(c*t+d));
}
vec3 palette1(float t){
  return palette(t,vec3(.7),vec3(.4),vec3(1.),vec3(.0,.33,.67));
}
vec3 palette2(float t){
  return palette(t,vec3(.5),vec3(.5),vec3(2.,1.,0.),vec3(.5,.2,.25));
}
float box_dist(vec3 p,vec3 b)
{
  vec3 q=abs(p)-b;
  return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);
}
float cyl_dist(vec3 p,float h,float r)
{
  vec2 d=abs(vec2(length(p.xy),p.z))-vec2(r,h);
  return min(max(d.x,d.t),0.)+length(max(d,0.));
}
vec2 pmod(vec2 p,float r)
{
  float a=atan(p.x,p.y)+PI/r;
  float n=2.*PI/r;
  a=floor(a/n)*n;
  return p*v2rotate(-a);
}
float base_map(vec3 p){
  p.z-=u_time*8.;
  float modnum=4.;
  p.xy*=v2rotate(p.z/modnum);
  p=mod(p,modnum)-modnum/2.;
  float res=2.;
  float main_dist=box_dist(p,vec3(.8)+sin(u_time*3.)*.2);
  vec2 leng=vec2(5.,.2);
  float xbox_dist=box_dist(p,leng.xyy);
  float ybox_dist=box_dist(p,leng.yxy);
  float zbox_dist=box_dist(p,leng.yyx);
  return min(main_dist,min(xbox_dist,min(ybox_dist,zbox_dist)));
}
vec3 get_base_normal(vec3 p){
  vec2 d=vec2(EPS,0.);
  return normalize(vec3(
      base_map(p+d.xyy)-base_map(p-d.xyy),
      base_map(p+d.yxy)-base_map(p-d.yxy),
      base_map(p+d.yyx)-base_map(p-d.yyx)
    ));
  }
  
  vec3 base_color(vec2 p){
    vec3 cam_pos=vec3(0.);
    float fov=length(p)*2.;
    vec3 ray=normalize(vec3(sin(fov)*p.x,sin(fov)*p.y,-cos(fov)));
    float dist=0.;
    vec3 ray_pos=cam_pos;
    float dist_val=0.;
    float min_dist=1000.;
    for(int i=0;i<30;i++){
      dist=base_map(ray_pos);
      min_dist=min(min_dist,dist);
      ray_pos+=dist*ray;
      dist_val+=exp(abs(dist)*-.2);
      if(abs(dist)<EPS)break;
    }
    vec3 color=vec3(1.)*dist_val*.02;
    vec3 light_dir=normalize(ray_pos-vec3(0.));
    vec3 color2=vec3(1.)*.03*dist_val;
    color+=vec3(1.)*(1.-exp(ray_pos.z/20.));
    if(abs(dist)<EPS){
      vec3 normal=get_base_normal(ray_pos);
      float prb=max(.1,dot(normal,light_dir));
      if(noise_shd(p.xy)<=prb)color+=.2;
    }
    return color;
  }
  float part_map_flow(vec3 p){
    p.y-=sin(p.z*1.3)*.3;
    p.z+=u_time*3.;
    p.xy*=v2rotate(-p.z*.2);
    float modnum=2.;
    p=mod(p,modnum)-modnum/2.;
    return cyl_dist(p,.1,0.);
  }
  float part_map_back(vec3 p){
    p.xy*=v2rotate(p.z);
    float modnum=1.;
    p=mod(p,modnum)-modnum/2.;
    return cyl_dist(p,0.,0.);
  }
  
  vec3 part_color(vec2 p){
    vec3 cam_pos=vec3(0.,0.,0.);
    const float fov=PI/3.;
    vec3 ray1=normalize(vec3(sin(fov)*p.x,sin(fov)*p.y,-cos(fov)));
    float fov2=length(p)*2.;
    vec3 ray2=normalize(vec3(sin(fov2)*p.x,sin(fov2)*p.y,-cos(fov2)));
    float fov3=PI/3.;
    vec3 ray3=normalize(vec3(sin(fov3)*p.x,sin(fov3)*p.y,-cos(fov3)));
    float dist1=0.;
    float dist2=0.;
    float dist3=0.;
    float min_dist1=100000.;
    float min_dist3=100000.;
    vec3 ray_pos1=cam_pos;
    vec3 ray_pos2=cam_pos;
    vec3 ray_pos3=cam_pos;
    for(int i=0;i<16;i++){
      dist1=part_map_flow(ray_pos1);
      dist2=base_map(ray_pos2);
      dist3=part_map_back(ray_pos3);
      
      min_dist1=min(dist1,min_dist1);
      min_dist3=min(dist3,min_dist3);
      
      ray_pos1+=dist1*ray1;
      ray_pos2+=dist2*ray2;
      ray_pos3+=dist3*ray3;
      if(dist1<EPS)break;
      if(dist2<EPS)break;
      if(dist3<EPS)break;
    }
    float emission1=pow(min_dist1+1.,-8.);
    vec3 f_color=(palette2(Perlin_noise(ray_pos1.xy*.2)*3.)+.8)*emission1;
    vec3 b_color=(1.-emission1)*base_color(p);
    return b_color+f_color;
  }
  
  void main(void){
    vec2 p=vUv*2.-1.;
    p*=v2rotate(u_time*.4);
    vec3 color=part_color(p);
    color*=.5;
    gl_FragColor=vec4(color,1.);
  }
  
  