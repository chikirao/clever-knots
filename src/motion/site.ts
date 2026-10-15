import {gsap} from 'gsap';
import {mountRope} from './rope-renderer';
let cleanup=()=>{};
export function initialize(){
  cleanup();const controller=new AbortController();const {signal}=controller;
  const on=(el:EventTarget|undefined|null,type:string,fn:EventListener)=>el?.addEventListener(type,fn,{signal});
  const menu=document.querySelector<HTMLDialogElement>('[data-menu]');const toggle=document.querySelector<HTMLButtonElement>('[data-menu-open]');
  on(toggle,'click',()=>{menu?.showModal();document.documentElement.classList.add('dialog-open');toggle?.setAttribute('aria-expanded','true');});
  on(document.querySelector('[data-menu-close]'),'click',()=>menu?.close());
  on(menu,'close',()=>{document.documentElement.classList.remove('dialog-open');toggle?.setAttribute('aria-expanded','false');toggle?.focus();});
  menu?.querySelectorAll('a').forEach(a=>on(a,'click',()=>menu.close()));
  const photos=[...document.querySelectorAll<HTMLButtonElement>('[data-photo]')];const box=document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const image=box?.querySelector<HTMLImageElement>('[data-lightbox-image]');let index=0,startX=0,startY=0;
  const zoom=box?.querySelector<HTMLButtonElement>('[data-photo-zoom]');
  function show(next:number){index=(next+photos.length)%photos.length;const photo=photos[index];if(!image||!photo)return;image.classList.remove('zoomed');zoom?.setAttribute('aria-pressed','false');if(zoom)zoom.textContent='Увеличить';image.src=photo.dataset.full!;image.alt=photo.dataset.caption!;box!.querySelector('[data-photo-count]')!.textContent=`${index+1} / ${photos.length}`;box!.querySelector('[data-lightbox-caption]')!.textContent=photo.dataset.caption!;}
  photos.forEach((button,i)=>on(button,'click',()=>{show(i);box?.showModal();document.documentElement.classList.add('dialog-open');}));
  on(box?.querySelector('[data-lightbox-close]'),'click',()=>box?.close());on(box,'close',()=>{document.documentElement.classList.remove('dialog-open');photos[index]?.focus();});
  on(box?.querySelector('[data-photo-prev]'),'click',()=>show(index-1));on(box?.querySelector('[data-photo-next]'),'click',()=>show(index+1));
  on(box,'keydown',((e:KeyboardEvent)=>{if(e.key==='ArrowRight'){e.preventDefault();show(index+1);}if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}}) as EventListener);
  const toggleZoom=()=>{const active=image?.classList.toggle('zoomed');zoom?.setAttribute('aria-pressed',String(!!active));if(zoom)zoom.textContent=active?'Уменьшить':'Увеличить';};
  on(image,'click',toggleZoom);on(zoom,'click',toggleZoom);
  on(image,'touchstart',((e:TouchEvent)=>{startX=e.changedTouches[0].clientX;startY=e.changedTouches[0].clientY;}) as EventListener);
  on(image,'touchend',((e:TouchEvent)=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)&&!image?.classList.contains('zoomed'))show(index+(dx<0?1:-1));}) as EventListener);
  const root=document.querySelector<HTMLElement>('[data-thread]');const destroyRope=root?mountRope(root):()=>{};
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  on(reduced,'change',()=>initialize());on(root,'rope:lost',()=>initialize());
  const context=gsap.context(()=>{if(!reduced.matches)gsap.fromTo('.hero-type,.hero-action',{opacity:.6,y:8},{opacity:1,y:0,duration:.65,ease:'power3.out',stagger:.07,clearProps:'all',onComplete:()=>root?.dispatchEvent(new Event('rope:layout'))});});
  cleanup=()=>{controller.abort();document.documentElement.classList.remove('dialog-open');menu?.close();box?.close();destroyRope();context.revert();};
}
document.addEventListener('astro:before-swap',()=>cleanup());
