// Run after npm run build. Exercises the actual generated page, not the dev toolbar.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'msedge',headless:true});
fs.mkdirSync('.qa',{recursive:true});
try{
 for(const width of [360,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:width===360?'reduce':'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/works/kozhanye-trevelbuki/');await page.waitForFunction(()=>!document.getElementById('loader'));
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('main h1').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow ${width}`);
  assert.equal(await page.locator('.tb-real-grid figure').count(),5,'Generated images must not appear in the real-photo section');
  for(const id of ['your-travelbook','your-colour','your-details']){
   await page.locator(`.tb-chapters a[href="#${id}"]`).click();
   await page.waitForTimeout(400);
   const section=page.locator('#'+id);await section.scrollIntoViewIfNeeded();
   const img=section.locator('img').first();await img.evaluate(async i=>{i.loading='eager';await i.decode();});
   assert(await img.evaluate(i=>i.naturalWidth>0));
   if(width===390||width===1440)await page.screenshot({path:`.qa/travelbook-v2-${width}-${id}.png`});
  }
  const buttons=page.locator('[data-photo]');assert.equal(await buttons.count(),10);
  await page.locator('#your-travelbook [data-photo]').click();
  assert(await page.locator('[data-lightbox]').evaluate(e=>e.open));
  assert((await page.locator('[data-lightbox-caption]').textContent()).includes('А4'));
  await page.getByRole('button',{name:'Следующее фото'}).click();
  assert((await page.locator('[data-lightbox-caption]').textContent()).includes('Синий'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-lightbox]').evaluate(e=>e.open),false);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`${width}: chapters, images, gallery, keyboard, overflow OK`);await page.close();
 }
}finally{await browser.close();server.close();}
