import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import YAML from 'yaml';
const schema=YAML.parse(fs.readFileSync('.pages.yml','utf8'));
const collection=schema.content.find(c=>c.name==='works');
assert.equal(collection.path,'src/content/works');
assert.equal(schema.media.output,'/src/assets/uploads');
const fields=new Map(collection.fields.map(f=>[f.name,f]));
for(const name of ['title','slug','description','category','images','published','order'])assert(fields.has(name),`CMS field ${name}`);
assert.equal(fields.get('published').default,false,'Новые работы должны быть черновиками');
const slugs=new Set();
for(const file of fs.readdirSync(collection.path).filter(f=>f.endsWith('.json'))){
  const work=JSON.parse(fs.readFileSync(path.join(collection.path,file),'utf8'));
  assert.equal(file,`${work.slug}.json`,'Имя файла должно совпадать с адресом');
  assert(!slugs.has(work.slug),'Повтор адреса работы');slugs.add(work.slug);
  for(const image of work.images){assert(image.alt.trim(),'Нужно описание фото');assert(fs.existsSync(image.src.replace(/^\//,'')),`Нет фото: ${image.src}`);}
}
console.log(`CMS paths and ${slugs.size} work entries verified.`);
