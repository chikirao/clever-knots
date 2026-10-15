import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto('http://127.0.0.1:4321/');await page.waitForTimeout(900);
for(const [name,selector] of [['selected','.selected'],['detail','.detail-section'],['contact','.contact']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(500);await page.screenshot({path:`.qa/scroll-${name}.png`});}
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4321/');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(900);await page.screenshot({path:'.qa/desktop-latest.png'});
const result=await page.evaluate(async()=>{const entries=performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),bytes:e.transferSize,type:e.initiatorType}));const ticks=[];await new Promise(resolve=>{let previous=performance.now(),count=0;function sample(now){ticks.push(now-previous);previous=now;if(++count<90)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});return {resources:entries,medianFrameMs:ticks.sort((a,b)=>a-b)[45]};});fs.writeFileSync('.qa/performance.json',JSON.stringify(result,null,2));console.log(result.medianFrameMs);await browser.close();
