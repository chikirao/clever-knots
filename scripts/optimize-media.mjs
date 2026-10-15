import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const dir=path.resolve('src/assets/uploads');
for(const file of await fs.readdir(dir)){
  if(!/\.(png|jpe?g|webp|avif)$/i.test(file))continue;
  const target=path.join(dir,file),input=await fs.readFile(target),metadata=await sharp(input).metadata();
  const image=sharp(input).rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true});
  const output=await image.toFormat(metadata.format,{quality:87}).toBuffer();
  if(output.length<input.length){await fs.writeFile(target,output);console.log(`${file}: ${Math.round(input.length/1024)} → ${Math.round(output.length/1024)} KB`);}
}
