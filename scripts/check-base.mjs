import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const astro=path.resolve('node_modules/astro/bin/astro.mjs');
const content=JSON.parse(fs.readFileSync('src/content/works/pletenie-dlya-butylki.json','utf8'));
const fixture='src/content/works/qa-hidden-draft.json';
assert(!fs.existsSync(fixture));
try{
  fs.writeFileSync(fixture,JSON.stringify({...content,slug:'qa-hidden-draft',title:'QA hidden draft',published:false}));
  execFileSync(process.execPath,[astro,'build'],{env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1',BASE_PATH:'/clever-knots/',SITE_URL:'https://chikirao.github.io'},stdio:'pipe'});
  assert(!fs.existsSync('dist/works/qa-hidden-draft/index.html'));
  const pages=['dist/index.html','dist/works/index.html','dist/works/pletenie-dlya-butylki/index.html','dist/about/index.html'];
  for(const file of pages){const html=fs.readFileSync(file,'utf8');assert(!html.includes('QA hidden draft'));for(const match of html.matchAll(/(?:href|src)="(\/[^"\s]+)"/g))assert(match[1].startsWith('/clever-knots/'),`${file}: ${match[1]}`);}
  assert(!fs.readFileSync('dist/sitemap.xml','utf8').includes('qa-hidden-draft'));
  console.log('GitHub Pages base paths and exclusion of unpublished work verified.');
}finally{
  fs.unlinkSync(fixture);
  execFileSync(process.execPath,[astro,'build'],{env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1',BASE_PATH:'/',SITE_URL:'https://chikirao.github.io'},stdio:'pipe'});
}
