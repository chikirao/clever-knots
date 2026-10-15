export type RopePoint={x:number;y:number;s:number;nx:number;ny:number};
type Vec={x:number;y:number};

/** Rope radius as a share of the rendered logo width, measured on the raster tail (≈79 px of 1024). */
export const ROPE_RADIUS=.0385;
/** Lay length (one full turn of the three strands) in rope diameters, measured on the raster tail. */
export const ROPE_LAY=159/79;
/** Centre line of the raster tail in rope-logo.webp pixels (1024×1536). The mesh starts here, under the
 *  still opaque image, and takes over while the CSS mask fades the image out (see .hero-sculpture img). */
const TAIL:[number,number][]=[[899,1000],[907,1020],[914.5,1040],[920.5,1060],[926.5,1080],[930,1100],[932,1120],[934,1140]];
/** Resting loop before the frayed end, in rope radii (y down). The return pass crosses the incoming rope. */
const LOOP:[number,number][]=[[0,0],[-.5,3],[-2.4,5.4],[-4.8,4.6],[-5.1,2],[-3,.9],[-.8,2.4],[.6,5],[1,7.2]];

export function ropeRadius(root:HTMLElement){return root.querySelector<HTMLElement>('[data-rope-logo] img')!.getBoundingClientRect().width*ROPE_RADIUS;}

/** Centripetal Catmull–Rom: no cusps or overshoot between unevenly spaced waypoints. */
function spline(points:Vec[]):Vec[]{
  const out:Vec[]=[],at=(i:number)=>points[Math.max(0,Math.min(points.length-1,i))];
  for(let i=0;i<points.length-1;i++){
    const p0=i?at(i-1):{x:2*at(0).x-at(1).x,y:2*at(0).y-at(1).y},p1=at(i),p2=at(i+1),p3=i+2<points.length?at(i+2):{x:2*p2.x-p1.x,y:2*p2.y-p1.y};
    const d=(a:Vec,b:Vec)=>Math.max(1e-3,Math.hypot(b.x-a.x,b.y-a.y)**.5);
    const t1=d(p0,p1),t2=t1+d(p1,p2),t3=t2+d(p2,p3),count=Math.max(2,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/2));
    const mix=(a:Vec,b:Vec,ta:number,tb:number,t:number)=>({x:(tb-t)/(tb-ta)*a.x+(t-ta)/(tb-ta)*b.x,y:(tb-t)/(tb-ta)*a.y+(t-ta)/(tb-ta)*b.y});
    for(let j=0;j<count;j++){
      const t=t1+(t2-t1)*j/count,a1=mix(p0,p1,0,t1,t),a2=mix(p1,p2,t1,t2,t),a3=mix(p2,p3,t2,t3,t);
      out.push(mix(mix(a1,a2,0,t2,t),mix(a2,a3,t1,t3,t),t1,t2,t));
    }
  }
  out.push(points.at(-1)!);return out;
}

/** Even arc-length resampling, so strand pitch and GPU sampling never depend on waypoint spacing. */
function resample(raw:Vec[],step:number):RopePoint[]{
  const out:Vec[]=[raw[0]];let carry=0;
  for(let i=1;i<raw.length;i++){
    const a=raw[i-1],b=raw[i],len=Math.hypot(b.x-a.x,b.y-a.y);let pos=step-carry;
    while(pos<=len){out.push({x:a.x+(b.x-a.x)*pos/len,y:a.y+(b.y-a.y)*pos/len});pos+=step;}
    carry=len-(pos-step);
  }
  out.push(raw.at(-1)!);let s=0;
  return out.map((p,i)=>{if(i)s+=Math.hypot(p.x-out[i-1].x,p.y-out[i-1].y);const prev=out[Math.max(0,i-2)],next=out[Math.min(out.length-1,i+2)],l=Math.hypot(next.x-prev.x,next.y-prev.y)||1;return{...p,s,nx:-(next.y-prev.y)/l,ny:(next.x-prev.x)/l};});
}

/** DOM boxes → waypoints → smooth, evenly sampled route in document coordinates. */
export function route(root:HTMLElement):RopePoint[]{
  const box=(selector:string,fallback?:DOMRect)=>{const e=root.querySelector<HTMLElement>(selector);const r=e?e.getBoundingClientRect():fallback!;return{left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+scrollY+r.height/2};};
  const logo=box('[data-rope-logo] img'),R=logo.width*ROPE_RADIUS,w=document.documentElement.clientWidth;
  const hero=root.querySelector('.hero')!.getBoundingClientRect(),heroBox=new DOMRect(0,hero.bottom,w,0);
  const tail=TAIL.map(([x,y])=>({x:logo.left+x/1024*logo.width,y:logo.top+y/1536*logo.height}));
  const heading=box('.section-heading',heroBox),photo=box('.selected-image',heroBox),caption=box('.work-caption',heroBox);
  const detail=box('.detail-section h2'),figure=box('.detail-section figure'),about=box('.about-preview'),contact=box('.contact');
  const loop=(ax:number,ay:number,k:number)=>LOOP.map(([x,y])=>({x:ax+x*R*k,y:ay+y*R*k}));
  let points:Vec[];
  if(w>=1000){
    // Desktop: right lane beside the text column, a wide sweep under the macro photo, then a resting loop in the contact block.
    const lane=w-Math.max(R*2.3,(w-heading.right)*.72);
    points=[...tail,
      {x:lane-R*.4,y:heading.top+heading.height*.25},
      {x:lane+R*.3,y:heading.bottom+R*2.5},
      {x:lane+R*.2,y:caption.cy},
      {x:figure.right-figure.width*.16,y:figure.top-(figure.top-Math.max(caption.bottom,photo.bottom-200))*.45},
      {x:figure.left+figure.width*.46,y:figure.top+R*1.6},
      {x:figure.left+figure.width*.6,y:figure.bottom-R*1.6},
      {x:figure.right-figure.width*.1,y:figure.bottom+R*3},
      {x:lane,y:about.top+about.height*.45},
      {x:lane-R*1.2,y:contact.top+R*1.5},
      ...loop(lane-R*1.6,contact.top+contact.height*.38,1.15)];
  }else{
    // Stacked layout: a calm wave along the right edge, partly over the photos, tucked behind wide buttons.
    const outer=w-R-5,inner=w-R*(w<420?2.3:3.3),button=box('.hero-action .button',heroBox),contactButton=box('.contact .button');
    points=[...tail,
      {x:outer,y:button.cy},
      {x:inner,y:heading.top+heading.height*.55},
      {x:outer,y:photo.top+photo.height*.3},
      {x:inner+R*.6,y:photo.top+photo.height*.55},
      {x:outer,y:photo.bottom-R*2},
      {x:inner+R,y:caption.cy},
      {x:inner,y:detail.cy},
      {x:outer,y:figure.top+figure.height*.45},
      {x:inner,y:figure.bottom+(about.top-figure.bottom)*.6},
      {x:outer,y:about.cy},
      {x:outer,y:contact.top+R*2},
      {x:outer,y:contactButton.top-R},
      ...loop(w-R*2.5,contactButton.bottom+R*.3,.9)];
  }
  return resample(spline(points),3);
}
