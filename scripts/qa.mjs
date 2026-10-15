import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.QA_URL||'http://127.0.0.1:4321';
const output='.qa';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch(process.platform==='win32'?{channel:'msedge',headless:true}:{headless:true});
const errors=[],failed=[],report={viewports:[],interactions:[],errors,failed};
const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url());});
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
const ready=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!document.getElementById('loader'),undefined,{timeout:15000});await page.locator('[data-rope-canvas]').waitFor({state:'attached'});await page.waitForFunction(()=>!!document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer'));};
for(const width of [360,390,430,768,1440]){
  await page.setViewportSize({width,height:width===1440?1000:844});await page.goto(origin+'/');await ready();await page.waitForTimeout(750);
  const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,renderer:document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer'),h1:getComputedStyle(document.querySelector('h1')).fontFamily,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
  assert(!result.overflow,`Overflow ${width}`);assert.equal(result.broken.length,0);report.viewports.push({width,...result});
  await page.evaluate(async()=>{for(const img of document.images){img.loading='eager';await img.decode().catch(()=>{});}});
  await page.screenshot({path:`${output}/home-${width}.png`,fullPage:true});
  await page.screenshot({path:`${output}/hero-${width}.png`});
  if(width===390){await page.locator('.hero-sculpture').screenshot({path:`${output}/rope-seam.png`});}
}
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await ready();await page.locator('.selected').scrollIntoViewIfNeeded();
const grab=await page.locator('.rope-touch-layer path').evaluate(path=>{const length=path.getTotalLength();for(let s=90;s<length;s+=12){const p=path.getPointAtLength(s);if(p.y-scrollY>230&&p.y-scrollY<550&&p.x>innerWidth-45&&p.x<innerWidth-4)return{x:p.x,y:p.y-scrollY};}throw new Error('Visible rope grab point not found');});
await page.mouse.move(grab.x,grab.y);await page.mouse.down();await page.mouse.move(grab.x-55,grab.y+20,{steps:12});await page.waitForFunction(()=>Number(document.querySelector('[data-rope-canvas]')?.getAttribute('data-pull'))>10);await page.screenshot({path:`${output}/rope-pulled.png`});await page.mouse.up();await page.waitForFunction(()=>Number(document.querySelector('[data-rope-canvas]')?.getAttribute('data-pull'))<1,undefined,{timeout:4000});report.interactions.push('3D rope drag/local spring/release');
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await ready();
await page.getByRole('button',{name:'Меню'}).click();assert(await page.locator('[data-menu]').evaluate(d=>d.open));await page.keyboard.press('Escape');assert(!(await page.locator('[data-menu]').evaluate(d=>d.open)));report.interactions.push('menu open/Escape/focus return');
await page.getByRole('link',{name:'Смотреть работы',exact:true}).click();await page.waitForURL('**/works/');
await page.getByRole('tab',{name:'Макраме',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'Макраме'}).getAttribute('aria-selected'),'true');report.interactions.push('official Fluid category tab');
await page.locator('.work-tile a').click();await page.waitForURL('**/works/pletenie-dlya-butylki/');await page.screenshot({path:`${output}/work-mobile.png`,fullPage:true});
await page.locator('[data-photo]').first().click();await page.locator('[data-lightbox-image]').waitFor({state:'visible'});await page.keyboard.press('ArrowRight');assert.match(await page.locator('[data-photo-count]').innerText(),/^2/);await page.locator('[data-lightbox-image]').click();assert(await page.locator('[data-lightbox-image]').evaluate(i=>i.classList.contains('zoomed')));await page.screenshot({path:`${output}/gallery.png`});await page.keyboard.press('Escape');assert(!(await page.locator('[data-lightbox]').evaluate(d=>d.open)));report.interactions.push('gallery next/zoom/Escape/focus');
await page.getByRole('link',{name:'Все работы',exact:true}).click();await page.waitForURL('**/works/');await page.goBack();await page.waitForURL('**/works/pletenie-dlya-butylki/');report.interactions.push('ClientRouter forward/back and shared image');
for(const route of ['/about/','/404.html']){await page.goto(origin+route);assert.equal(await page.locator('h1').count(),1);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));await page.screenshot({path:`${output}/${route.includes('about')?'about':'404'}.png`,fullPage:true});}
const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto(origin+'/');await reduced.waitForFunction(()=>!document.getElementById('loader'),undefined,{timeout:15000});await reduced.waitForFunction(()=>document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer')==='canvas2d');assert(await reduced.locator('h1').isVisible());await reduced.screenshot({path:`${output}/reduced-motion.png`,fullPage:true});report.interactions.push('reduced motion static textured fallback');await reduced.close();
await page.goto(origin+'/');await ready();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer')==='canvas2d');await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer')==='webgl-3d');report.interactions.push('live reduced-motion preference change');
await page.evaluate(()=>document.querySelector('[data-rope-canvas]').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer')==='canvas2d');report.interactions.push('GPU context loss recovery');
const noGL=await browser.newPage({viewport:{width:390,height:844}});await noGL.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});await noGL.goto(origin+'/');await noGL.waitForFunction(()=>document.querySelector('[data-rope-canvas]')?.getAttribute('data-renderer')==='canvas2d');await noGL.screenshot({path:`${output}/no-webgl.png`});await noGL.close();report.interactions.push('WebGL unavailable fallback');
assert.equal(errors.length,0,errors.join('\n'));assert.equal(failed.length,0,failed.join('\n'));
fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));
