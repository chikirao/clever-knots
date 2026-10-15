import {gsap} from 'gsap';
import {route,ropeRadius} from './rope';
import {mountRope3D} from './rope-3d';
export function mountRope(root:HTMLElement):()=>void{
  const existing=root.querySelector<HTMLCanvasElement>('[data-rope-canvas]')!;
  if(existing.dataset.renderer){const fresh=existing.cloneNode() as HTMLCanvasElement;fresh.removeAttribute('data-renderer');fresh.removeAttribute('data-pull');fresh.removeAttribute('style');existing.replaceWith(fresh);}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),saveData=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
  if(!reduced.matches&&!saveData&&!root.dataset.ropeFallback){try{const cleanup=mountRope3D(root);if(cleanup)return cleanup;}catch(error){console.warn(error);root.querySelector('.rope-touch-layer')?.remove();root.querySelector<HTMLCanvasElement>('[data-rope-canvas]')?.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();}}
  const initial=root.querySelector<HTMLCanvasElement>('[data-rope-canvas]')!,canvas=initial.cloneNode() as HTMLCanvasElement;canvas.removeAttribute('style');initial.replaceWith(canvas);const ctx=canvas.getContext('2d')!;canvas.dataset.renderer='canvas2d';
  let points=route(root),width=innerWidth,height=innerHeight,previousScroll=-1,dirty=true,disposed=false;
  function resize(){width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;const dpr=Math.min(devicePixelRatio,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);points=route(root);dirty=true;}
  function render(){if(disposed||document.hidden||(!dirty&&previousScroll===scrollY))return;dirty=false;previousScroll=scrollY;const dpr=canvas.width/width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);const visible=points.filter(p=>p.y-scrollY>-40&&p.y-scrollY<height+40);if(!visible.length)return;const radius=ropeRadius(root);ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#38251235';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
    ctx.beginPath();visible.forEach((p,i)=>i?ctx.lineTo(p.x,p.y-scrollY):ctx.moveTo(p.x,p.y-scrollY));ctx.strokeStyle='#a0643c';ctx.lineWidth=radius*2;ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    for(let k=0;k<18;k++){ctx.beginPath();visible.forEach((p,i)=>{const offset=Math.sin(p.s/radius*3+k*.35)*radius*.75,xx=p.x+p.nx*offset,yy=p.y-scrollY+p.ny*offset;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.strokeStyle=k%3===0?'#cf9a6e':'#6a3519';ctx.lineWidth=.6;ctx.stroke();}
  }
  const observer=new ResizeObserver(resize);observer.observe(root);addEventListener('resize',resize);root.addEventListener('rope:layout',resize);resize();gsap.ticker.add(render);
  return()=>{disposed=true;observer.disconnect();removeEventListener('resize',resize);root.removeEventListener('rope:layout',resize);gsap.ticker.remove(render);};
}
