import {gsap} from 'gsap';
import {route,ropeRadius,ROPE_LAY,type RopePoint} from './rope';
import fibreUrl from '../assets/rope-fibre.png?url';

/** The fibre tile starts 40 px of the 79 px logo rope (≈1.01 radii) below the route start, so photo and mesh line up at the seam. */
const FIBRE_TOP=40/39.5;
/** The canvas lives in the document, not in the viewport: the compositor scrolls it together with the page, so the rope
 *  never trails behind a native (iOS momentum) scroll. It covers the visible area plus this many viewport heights above
 *  and below, and moves only when the scroll gets within GUARD viewport heights of its edge. */
const OVERSCAN=.5,GUARD=.25;
/** A touch on the rope pulls it only when it heads more than this many degrees away from vertical; steeper swipes scroll. */
const PULL_ANGLE=60;
/** Movement in px that decides the direction of a touch gesture; it is then kept until the finger lifts. */
const DECIDE_DISTANCE=10;
/** Canvas pixel budget: the band is taller than the screen, so the resolution drops slightly on very large screens. */
const PIXELS=matchMedia('(pointer:coarse)').matches?4e6:1.2e7;

/* One ribbon along the route. Every pixel solves the cross-section of a real three-strand Z-laid rope:
 * three round strands on a helix, the front-most surface wins. That gives true strand silhouettes,
 * V-shaped crevices, slanted strand normals and seamless bends without per-strand meshes. */
const vertex=`
attribute vec2 aPosition;
attribute vec2 aNormal;
attribute vec2 aRope;
uniform vec2 uViewport,uPull,uOffset;
uniform float uScroll,uGrab,uSpread,uPin,uR,uEnd,uWidth,uLag;
varying float vS,vV;
varying vec2 vT;
void main(){
  float s=aRope.x;
  float weight=exp(-pow((s-uGrab)/uSpread,2.0))*smoothstep(uPin,uPin+uR*6.0,s);
  float halfWidth=uR*(uWidth+.85*smoothstep(uEnd-uR*4.5,uEnd,s));
  vec2 p=aPosition+aNormal*aRope.y*halfWidth+uPull*weight+uOffset;
  vS=s;vV=aRope.y*halfWidth;vT=vec2(aNormal.y,-aNormal.x);
  float depth=.5-max(s-uLag,0.0)/max(uEnd,1.0)*.45;
  gl_Position=vec4(p.x/uViewport.x*2.0-1.0,1.0-(p.y-uScroll)/uViewport.y*2.0,depth,1.0);
}`;
const rope=`
precision highp float;
varying float vS,vV;
varying vec2 vT;
uniform sampler2D uNoise,uFibre;
uniform float uR,uPitch,uPhase,uEnd,uDpr,uFade,uShear,uFibreShift,uFibreRelief,uFibreSkew;
const float TAU=6.2831853;
float noise(vec2 p){return texture2D(uNoise,p/256.0).r;}
float photo(vec2 p,float m){return mix(texture2D(uFibre,p).r,texture2D(uFibre,p+vec2(0.0,1.0/3.0)).r,m);}
const float E=1.5;
/* Strand layout at arc length s. Frayed end: the lay loosens and the strands drift apart. */
void lay(float s,float v,out float theta,out float twist,out float rs,out float rho,out float t){
  float L=uR*4.5,s0=uEnd-L,w=-TAU/uPitch;
  t=clamp((s-s0)/L,0.0,1.0);
  // Hand-made rope is never perfect: the lay and the strand thickness drift slowly along the length.
  float drift=noise(vec2(s*.004,17.0))-noise(vec2(0.0,17.0)),swell=noise(vec2(s*.011,29.0))-.5;
  theta=w*(min(s,s0)+L*(t-.35*t*t))+uPhase+uShear*v/uR+drift*.9;twist=w*(1.0-.7*t);
  rs=uR*(.58+.34*t*t);rho=uR*(.42-.08*t)*(1.0+swell*.08);
}
/* Front surface of one strand over the ray at v. A round strand on a helix, cut across the rope axis,
 * is an ellipse stretched along the turn. Returns the ellipse half-extent margin in edge. */
float strand(float th,float v,float rs,float rho,out float dv,out float dz,out float edge){
  float c=cos(th),sn=sin(th),ir=1.0/(rho*rho),it=ir/(E*E);
  dv=v-rs*c;edge=rho*sqrt(c*c+E*E*sn*sn)-abs(dv);
  float A=sn*sn*ir+c*c*it,B=2.0*dv*c*sn*(ir-it),C=dv*dv*(c*c*ir+sn*sn*it)-1.0;
  dz=(-B+sqrt(max(B*B-4.0*A*C,0.0)))/(2.0*A);
  return rs*sn+dz;
}
float height(float s,float v){
  float theta,twist,rs,rho,t,dv,dz,edge,h=-1e4;
  lay(s,v,theta,twist,rs,rho,t);
  for(int k=0;k<3;k++){float z=strand(theta+float(k)*TAU/3.0,v,rs,rho,dv,dz,edge);if(edge>0.0)h=max(h,z);}
  return h;
}
void main(){
  float s=vS,v=vV;
  float theta,twist,rs,rho,t;
  lay(s,v,theta,twist,rs,rho,t);
  float L=uR*4.5,s0=uEnd-L;
  float z1=-1e4,z2=-1e4,cov=0.0,dv1=0.0,dz1=0.0,th1=0.0,id=0.0;
  for(int k=0;k<3;k++){
    float th=theta+float(k)*TAU/3.0,dv,dz,edge;
    float z=strand(th,v,rs,rho,dv,dz,edge);
    cov=max(cov,clamp(edge*uDpr+.5,0.0,1.0));
    if(edge<=-1.5/uDpr)z=-1e4;
    if(z>z1){z2=z1;z1=z;dv1=dv;dz1=dz;th1=th;id=float(k);}else if(z>z2){z2=z;}
  }
  float sn=sin(th1),cs=cos(th1);
  float ea=(dv1*cs+dz1*sn)/rho,eb=(dz1*cs-dv1*sn)/(rho*E);
  vec3 o=normalize(vec3(0.0,ea*cs/rho-eb*sn/(rho*E),ea*sn/rho+eb*cs/(rho*E)));
  vec3 axis=normalize(vec3(1.0,-rs*twist*sn,rs*twist*cs));
  vec3 n=normalize(o-dot(o,axis)*axis+vec3(0.0,0.0,1e-3));
  // Yarn coordinates: psi is fixed to the strand, so fibres follow it, leaning slightly towards the rope axis.
  float psi=atan(eb,ea);
  float fc=psi*rho*.62+s*.1+id*61.0,along=s*.16+id*23.0;
  float f1=noise(vec2(fc,along)),f2=noise(vec2(fc*2.1+17.0,s*.38+id*7.0)),f3=noise(vec2(fc*.3+5.0,s*.04));
  // Photographed cotton, high-passed and mapped in rope space. A tile holds three crevice periods, so a
  // shift by a third keeps the crevices in place while the fibres change: no visible repeat along the page.
  float mixA=smoothstep(.3,.7,noise(vec2(s*.007,id*0.0+3.0)));
  vec2 uv=vec2(.5+.5*v/(uR*.937),(s+uFibreSkew*v+uFibreShift)/uPitch);
  float d0=photo(uv,mixA);
  float du=photo(uv+vec2(1.5/128.0,0.0),mixA)-photo(uv-vec2(1.5/128.0,0.0),mixA);
  float ds=photo(uv+vec2(0.0,1.5/256.0),mixA)-photo(uv-vec2(0.0,1.5/256.0),mixA);
  float yarn=clamp(.5+(d0-.5)*(d0>.5?2.8:1.6)+(f1-.5)*.25+(f3-.5)*.2,0.0,1.0);
  // Frayed tip: the untwisted strands turn into a fanned brush of single fibres of uneven length.
  float brush=smoothstep(.3,.8,t);
  float fan=v*(1.0-.4*brush)/(uR*.075)+noise(vec2(v*.05,s*.03))*2.5;
  float fl=floor(fan),line=1.0-abs(2.0*fract(fan)-1.0);
  float fibreEnd=uEnd-uR*(.05+1.8*noise(vec2(fl*5.3,11.0)));
  float fibres=smoothstep(.35,.85,line)*step(abs(v),(rs+rho)*1.08)*(1.0-smoothstep(fibreEnd-1.0,fibreEnd+1.0,s));
  cov=max(cov*(1.0-brush),fibres*brush);
  yarn=mix(yarn,.45+.55*noise(vec2(fl*3.7,s*.05)),brush);
  // Screen space: x right, y down, z towards the viewer.
  vec2 tt=normalize(vT),nn=vec2(-tt.y,tt.x);
  vec3 N=normalize(vec3(tt*n.x+nn*n.y,n.z));
  N=normalize(N-vec3(nn*du+tt*ds,0.0)*uFibreRelief);
  vec3 fibre=normalize(mix(axis,vec3(1.0,0.0,0.0),.35));
  vec3 F=normalize(vec3(tt*fibre.x+nn*fibre.y,fibre.z));
  vec3 light=normalize(vec3(-.48,-.62,.85)),H=normalize(light+vec3(0.0,0.0,1.0));
  // Self-shadow: march towards the light; a neighbouring strand above the ray shades this point.
  vec2 toLight=vec2(dot(light.xy,tt),dot(light.xy,nn));
  float lit=1.0;
  for(int i=1;i<=5;i++){
    float d=float(i)*uR*.1;
    lit=min(lit,smoothstep(-uR*.03,uR*.12,z1+light.z*d-height(s+toLight.x*d,v+toLight.y*d)));
  }
  lit=mix(1.0,lit,1.0-brush);
  float diffuse=clamp((dot(N,light)+.25)/1.25,0.0,1.0)*mix(.42,1.0,lit);
  float crevice=smoothstep(0.0,rho*.85,z1-z2);
  float ao=mix(.12,1.0,crevice)*mix(.3,1.0,smoothstep(uR*.05,uR*.95,z1));
  float fh=dot(F,H),sheen=pow(max(1.0-fh*fh,0.0),6.0);
  float mottling=noise(vec2(s*.012,id*9.0+1.0));
  vec3 albedo=vec3(.43,.158,.054)*(.5+.95*yarn)*(.9+.2*mottling)*(1.0+.05*(id-1.0));
  // Cotton scatters light between fibres: shadowed parts get deeper and more saturated, not grey.
  // Light bleeding through the fibres warms the shadow edge towards red, as on the photographed knot.
  float terminator=smoothstep(.02,.3,diffuse)*(1.0-smoothstep(.3,.7,diffuse))*mix(.5,1.0,ao);
  vec3 occlusion=pow(vec3(ao),vec3(.8,1.45,2.4));
  vec3 color=albedo*(.21*occlusion+1.2*diffuse*mix(occlusion,vec3(1.0),.35))+vec3(.2,.2,.185)*pow(diffuse,3.0)*yarn*yarn+albedo*vec3(.2,.02,.0)*terminator+vec3(1.0,.88,.76)*sheen*.065*yarn*ao*lit;
  color=pow(color,vec3(1.0/2.2));
  // Stray cotton fibres just outside the silhouette.
  float r=abs(v)-(rs+rho)*.94,side=v>0.0?1.0:0.0;
  float hair=smoothstep(.74,.9,noise(vec2((s+r*1.8)*.42,side*41.0+r*.05)))*exp(-max(r,0.0)/(uR*.13))*step(-.5,r)*.55;
  hair*=1.0-smoothstep(s0,uEnd,s);
  vec3 hairColor=pow(vec3(.5,.29,.15),vec3(1.0/2.2));
  float alpha=max(cov,hair)*smoothstep(0.0,uFade,s);
  if(alpha<.01)discard;
  vec3 rgb=mix(hairColor,color,cov/max(cov,hair));
  gl_FragColor=vec4(rgb*alpha,alpha);
}`;
const shadow=`
precision highp float;
varying float vS,vV;
uniform float uR,uEnd,uFade,uShadow;
void main(){
  float d=vV/uR;
  float a=(exp(-d*d*1.5)*.2+exp(-d*d*3.6)*.14)*uShadow;
  a*=smoothstep(0.0,uFade,vS)*(1.0-.55*smoothstep(uEnd-uR*3.0,uEnd,vS));
  gl_FragColor=vec4(vec3(.16,.09,.04)*a,a);
}`;

/** Analytic rope impostor on a single triangle strip. The GPU moves the grabbed area; no geometry upload per frame. */
export function mountRope3D(root:HTMLElement):null|(()=>void){
  const canvas=root.querySelector<HTMLCanvasElement>('[data-rope-canvas]')!;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:true,stencil:true,premultipliedAlpha:true,powerPreference:'low-power'});
  if(!gl)return null;
  const controller=new AbortController(),{signal}=controller;
  let points:RopePoint[]=[],radius=12,pin=0,length=1,width=innerWidth,dirty=true,disposed=false,occlusion:{left:number;right:number;top:number;bottom:number}[]=[];
  let strip:WebGLBuffer|null=null,count=0;
  const x={position:0,velocity:0,target:0},y={position:0,velocity:0,target:0};
  let grabbed=0,pointer:number|null=null,pointerStart={x:0,y:0},shapeDirty=true;
  // Band of the page the canvas covers, all in page coordinates. viewH keeps the tallest viewport seen at this width,
  // so the iOS toolbar showing and hiding during a scroll does not reallocate the canvas.
  let viewW=0,viewH=0,bandTop=0,bandH=1,rootTop=0,rootLeft=0,rootH=1;
  const spread=()=>width<1000?145:240;
  const namespace='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(namespace,'svg');
  svg.classList.add('rope-touch-layer');
  const group=document.createElementNS(namespace,'g');
  const hit=document.createElementNS(namespace,'path');
  hit.setAttribute('fill','none');hit.setAttribute('stroke','transparent');hit.setAttribute('role','button');hit.setAttribute('tabindex','0');hit.setAttribute('aria-label','Потянуть за нить. Нажмите пробел или захватите и потяните.');
  group.append(hit);svg.append(group);root.append(svg);

  function shader(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw new Error(gl!.getShaderInfoLog(s)||'Rope shader');return s;}
  function program(source:string){const p=gl!.createProgram()!,v=shader(gl!.VERTEX_SHADER,vertex),f=shader(gl!.FRAGMENT_SHADER,source);gl!.attachShader(p,v);gl!.attachShader(p,f);gl!.linkProgram(p);gl!.deleteShader(v);gl!.deleteShader(f);if(!gl!.getProgramParameter(p,gl!.LINK_STATUS))throw new Error(gl!.getProgramInfoLog(p)||'Rope shader link');return p;}
  const material=program(rope),shade=program(shadow);
  const names=['uViewport','uPull','uOffset','uScroll','uGrab','uSpread','uPin','uR','uEnd','uWidth','uLag','uPitch','uPhase','uDpr','uFade','uNoise','uShadow','uShear','uFibre','uFibreShift','uFibreRelief','uFibreSkew'];
  const uniformMap=(p:WebGLProgram)=>Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));
  const materialUniforms=uniformMap(material),shadowUniforms=uniformMap(shade);

  // Tileable value noise, filtered by the sampler. Fibres, plies and mottling all read it.
  const size=256,texels=new Uint8Array(size*size*4);
  let seed=1234567;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<texels.length;i++)texels[i]=Math.round(random()*255);
  const texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,texels);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);

  // Cotton detail photographed on the logo tail (scripts/rope-fibre.py). Neutral until it has loaded.
  const fibre=gl.createTexture()!;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,fibre);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const fibreImage=new Image();fibreImage.decoding='async';
  fibreImage.onload=()=>{if(disposed)return;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,fibre);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,fibreImage);dirty=true;};
  fibreImage.src=fibreUrl;
  function build(){
    points=route(root);radius=ropeRadius(root);length=points.at(-1)!.s;
    // The part under the raster tail stays pinned to the logo.
    const logo=root.querySelector('[data-rope-logo] img')!.getBoundingClientRect(),tailEnd=logo.top+scrollY+logo.height*.74;
    pin=(points.find(p=>p.y>=tailEnd)||points[0]).s;
    // The rope passes under the photos: no grab zone where it is hidden.
    occlusion=[...root.querySelectorAll('.selected-image img,.detail-section figure img')].map(img=>{const r=img.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY};});
    const data=new Float32Array(points.length*12);
    points.forEach((p,i)=>{for(const side of [0,1]){const o=(i*2+side)*6;data.set([p.x,p.y,p.nx,p.ny,p.s,side?-1:1],o);}});
    if(!strip)strip=gl!.createBuffer();gl!.bindBuffer(gl!.ARRAY_BUFFER,strip);gl!.bufferData(gl!.ARRAY_BUFFER,data,gl!.STATIC_DRAW);count=points.length*2;
    hit.setAttribute('stroke-width',String(radius*2+14));dirty=true;shapeDirty=true;
  }
  /** Keep the band around the visible area. Returns early while the compositor still has GUARD of drawn rope ahead. */
  function place(force=false){
    const top=scrollY,view=innerHeight,min=rootTop,max=rootTop+rootH-bandH,guard=viewH*GUARD;
    if(!force&&(top>=bandTop+guard||bandTop<=min)&&(top+view<=bandTop+bandH-guard||bandTop>=max))return;
    const next=Math.round(Math.max(min,Math.min(max,top-(bandH-view)/2)));
    if(next===bandTop&&!force)return;
    bandTop=next;canvas.style.top=`${bandTop-rootTop}px`;dirty=true;
  }
  function resize(){
    if(disposed)return;
    if(innerWidth!==viewW){viewW=innerWidth;viewH=0;}viewH=Math.max(viewH,innerHeight);
    const box=root.getBoundingClientRect();rootLeft=box.left+scrollX;rootTop=box.top+scrollY;rootH=box.height;width=box.width;
    bandH=Math.max(1,Math.min(Math.round(rootH),Math.ceil(viewH*(1+2*OVERSCAN))));
    const dpr=Math.min(devicePixelRatio,2,Math.sqrt(PIXELS/(width*bandH))),w=Math.round(width*dpr),h=Math.round(bandH*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl!.viewport(0,0,w,h);}
    canvas.style.height=`${bandH}px`;
    svg.setAttribute('viewBox',`0 0 ${width} ${rootH}`);group.setAttribute('transform',`translate(${-rootLeft},${-rootTop})`);
    build();place(true);
  }
  function nearest(px:number,py:number){let min=Infinity,best=points[0];for(const p of points){const distance=(p.x-px)**2+(p.y-py)**2;if(distance<min){min=distance;best=p;}}return best;}
  /* Mouse grabs at once. A touch (or pen) that lands on the rope is a page scroll by default: its first DECIDE_DISTANCE px
   * pick the direction for the whole gesture, and only a sideways one, more than PULL_ANGLE from vertical, pulls. */
  let mode:'idle'|'pending'|'pull'|'native'|'drag'='idle',blocked=false,lastY=0,touchStart={x:0,y:0};
  function grab(e:PointerEvent){mode='pull';grabbed=Math.max(pin+radius*4,nearest(pointerStart.x,pointerStart.y+scrollY).s);hit.setPointerCapture(e.pointerId);hit.classList.add('grabbed');dirty=true;}
  hit.addEventListener('pointerdown',e=>{
    if(e.button!==0||pointer!==null)return;
    pointer=e.pointerId;pointerStart={x:e.clientX,y:e.clientY};lastY=e.clientY;blocked=false;
    if(e.pointerType==='mouse'){e.preventDefault();grab(e);}else mode='pending';
  },{signal});
  hit.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId)return;
    const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
    if(mode==='pending'){
      if(Math.hypot(dx,dy)<DECIDE_DISTANCE)return;
      // Up to 45° the browser scrolls (pan-y). Between 45° and PULL_ANGLE it will not, and neither will it after a cancelled
      // sideways touchmove, so the page follows the finger by hand.
      const angle=Math.atan2(Math.abs(dx),Math.abs(dy))*180/Math.PI;
      if(angle>PULL_ANGLE)grab(e);else mode=angle>45||blocked?'drag':'native';
    }
    if(mode==='drag'){scrollTo({top:scrollY+lastY-e.clientY,behavior:'instant'});lastY=e.clientY;return;}
    if(mode!=='pull')return;
    const max=width<1000?65:90,factor=Math.min(1,max/(Math.hypot(dx,dy)||1));x.target=dx*factor;y.target=dy*factor;dirty=true;
  },{signal});
  // pan-y lets the browser scroll vertical swipes itself (it then sends pointercancel). iOS Safari may still start a
  // vertical pan on a slightly slanted sideways swipe, so touchmove is cancelled while the swipe heads sideways or pulls.
  hit.addEventListener('touchstart',e=>{const t=e.touches[0];touchStart={x:t.clientX,y:t.clientY};},{signal,passive:true});
  hit.addEventListener('touchmove',e=>{
    const t=e.touches[0],sideways=Math.abs(t.clientX-touchStart.x)>Math.abs(t.clientY-touchStart.y);
    if(e.cancelable&&(mode==='pull'||mode==='drag'||(mode==='pending'&&sideways))){e.preventDefault();blocked=true;}
  },{signal,passive:false});
  const letGo=()=>{pointer=null;mode='idle';x.target=0;y.target=0;hit.classList.remove('grabbed');dirty=true;};
  hit.addEventListener('pointerup',letGo,{signal});hit.addEventListener('pointercancel',letGo,{signal});hit.addEventListener('lostpointercapture',letGo,{signal});
  hit.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();grabbed=Math.max(pin+radius*4,nearest(width*.85,scrollY+innerHeight*.7).s);x.velocity-=220;y.velocity+=60;dirty=true;}},{signal});
  function draw(p:WebGLProgram,u:Record<string,WebGLUniformLocation|null>,widthScale:number,offset:[number,number],lag:number,shadowStrength=1){
    gl!.useProgram(p);
    gl!.uniform2f(u.uViewport,width,bandH);gl!.uniform2f(u.uPull,x.position,y.position);gl!.uniform2f(u.uOffset,offset[0]-rootLeft,offset[1]);gl!.uniform1f(u.uScroll,bandTop);
    gl!.uniform1f(u.uGrab,grabbed);gl!.uniform1f(u.uSpread,spread());gl!.uniform1f(u.uPin,pin);gl!.uniform1f(u.uR,radius);gl!.uniform1f(u.uEnd,length);
    gl!.uniform1f(u.uWidth,widthScale);gl!.uniform1f(u.uLag,lag);gl!.uniform1f(u.uPitch,radius*2*ROPE_LAY);gl!.uniform1f(u.uPhase,0);
    gl!.uniform1f(u.uDpr,canvas.width/width);gl!.uniform1f(u.uFade,radius*1.2);gl!.uniform1i(u.uNoise,0);gl!.uniform1f(u.uShadow,shadowStrength);gl!.uniform1f(u.uShear,-.3);gl!.uniform1i(u.uFibre,1);gl!.uniform1f(u.uFibreShift,-radius*FIBRE_TOP);gl!.uniform1f(u.uFibreRelief,.45);gl!.uniform1f(u.uFibreSkew,.6);
    gl!.bindBuffer(gl!.ARRAY_BUFFER,strip);
    for(const [name,offsetBytes] of [['aPosition',0],['aNormal',8],['aRope',16]] as const){const location=gl!.getAttribLocation(p,name);if(location<0)continue;gl!.enableVertexAttribArray(location);gl!.vertexAttribPointer(location,2,gl!.FLOAT,false,24,offsetBytes);}
    gl!.drawArrays(gl!.TRIANGLE_STRIP,0,count);
  }
  function render(_time:number,deltaMs:number){
    if(disposed||document.hidden)return;
    const active=Math.abs(x.position)+Math.abs(y.position)+Math.abs(x.velocity)+Math.abs(y.velocity)+Math.abs(x.target)+Math.abs(y.target)>.04;
    if(active){const dt=Math.min(deltaMs/1000,1/30);for(let i=0;i<2;i++)for(const spring of [x,y]){const step=dt/2;spring.velocity+=((spring.target-spring.position)*180-spring.velocity*(pointer===null?16:26))*step;spring.position+=spring.velocity*step;}dirty=true;}
    place();
    if(!dirty)return;dirty=false;
    const shadowOffset:[number,number]=[radius*.14,radius*.3];
    gl!.clearColor(0,0,0,0);gl!.clearStencil(0);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT|gl!.STENCIL_BUFFER_BIT);
    gl!.activeTexture(gl!.TEXTURE0);gl!.bindTexture(gl!.TEXTURE_2D,texture);gl!.activeTexture(gl!.TEXTURE1);gl!.bindTexture(gl!.TEXTURE_2D,fibre);
    gl!.enable(gl!.BLEND);gl!.blendFunc(gl!.ONE,gl!.ONE_MINUS_SRC_ALPHA);
    // 1. Soft shadow on the page.
    gl!.disable(gl!.DEPTH_TEST);gl!.disable(gl!.STENCIL_TEST);gl!.depthMask(false);draw(shade,shadowUniforms,2.1,shadowOffset,0);
    // 2. Rope. Later arc length is nearer, so a crossing loop lies on top of itself.
    gl!.enable(gl!.DEPTH_TEST);gl!.depthFunc(gl!.LEQUAL);gl!.depthMask(true);
    gl!.enable(gl!.STENCIL_TEST);gl!.stencilFunc(gl!.ALWAYS,1,255);gl!.stencilOp(gl!.KEEP,gl!.KEEP,gl!.REPLACE);
    draw(material,materialUniforms,1.3,[0,0],0);
    // 3. Where the rope crosses itself, the upper pass casts its shadow onto the lower one.
    gl!.depthFunc(gl!.LESS);gl!.depthMask(false);gl!.stencilFunc(gl!.EQUAL,1,255);gl!.stencilOp(gl!.KEEP,gl!.KEEP,gl!.KEEP);
    draw(shade,shadowUniforms,2.1,shadowOffset,radius*5,1.6);
    gl!.disable(gl!.STENCIL_TEST);gl!.depthMask(true);
    if(active||shapeDirty){let connected=false;const commands:string[]=[];
      for(const p of points){if(p.s<pin)continue;const lock=Math.min(1,(p.s-pin)/(radius*6)),weight=Math.exp(-Math.pow((p.s-grabbed)/spread(),2))*lock,px=p.x+x.position*weight,py=p.y+y.position*weight;if(occlusion.some(o=>px>o.left&&px<o.right&&py>o.top&&py<o.bottom)){connected=false;continue;}commands.push(`${connected?'L':'M'}${px.toFixed(1)},${py.toFixed(1)}`);connected=true;}
      hit.setAttribute('d',commands.join(' '));shapeDirty=false;}
    canvas.dataset.pull=String(Math.round(Math.hypot(x.position,y.position)*10)/10);
  }
  const observer=new ResizeObserver(resize);observer.observe(root);
  // Layout changes reach the ResizeObserver. A shrinking iOS toolbar is not one: only a new width or a taller viewport counts.
  addEventListener('resize',()=>{if(innerWidth!==viewW||innerHeight>viewH)resize();},{signal});
  // The hero entrance animation moves the main button without resizing the root: rebuild the route once it has settled.
  root.addEventListener('rope:layout',resize,{signal});document.fonts.ready.then(()=>{if(!disposed)resize();});
  canvas.addEventListener('webglcontextlost',e=>{if(disposed)return;e.preventDefault();root.dataset.ropeFallback='true';root.dispatchEvent(new Event('rope:lost'));},{signal});
  canvas.dataset.renderer='webgl-3d';resize();gsap.ticker.add(render);
  return()=>{disposed=true;controller.abort();observer.disconnect();gsap.ticker.remove(render);svg.remove();if(strip)gl.deleteBuffer(strip);gl.deleteTexture(texture);gl.deleteTexture(fibre);gl.deleteProgram(material);gl.deleteProgram(shade);gl.getExtension('WEBGL_lose_context')?.loseContext();};
}
