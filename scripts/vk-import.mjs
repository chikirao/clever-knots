// Imports the VK community market into src/content/works through the official API (market.get).
//
//   VK_TOKEN=... node scripts/vk-import.mjs          # write changes
//   VK_TOKEN=... node scripts/vk-import.mjs --dry    # only print what would change
//
// VK_TOKEN: community access key with the «Товары» permission (Управление → Работа с API → Ключи доступа).
// Never commit it: in CI it comes from the repository secret VK_TOKEN.
//
// Ownership of fields, so the importer and Pages CMS do not fight:
//   from VK, refreshed every run: title, description, price, availability, images, vkId, vkUrl
//   from the site, set once on creation and then left alone: slug, category, published, featured, order
// Works without vkId (added by hand in the CMS) are never touched.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const GROUP_ID = Number(process.env.VK_GROUP_ID || 225481050);
const API = 'https://api.vk.com/method/';
const VERSION = '5.199';
const WORKS = 'src/content/works';
const PHOTOS = 'src/assets/uploads/vk';
const dry = process.argv.includes('--dry');
const token = process.env.VK_TOKEN;
if (!token) { console.error('Нужен VK_TOKEN: ключ доступа сообщества с правом «Товары».'); process.exit(1); }

async function call(method, params) {
  // POST keeps the token out of URLs and logs.
  const body = new URLSearchParams({...params, access_token: token, v: VERSION});
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + method, {method: 'POST', body});
    const json = await res.json();
    if (json.error?.error_code === 6 && attempt < 5) { await new Promise(r => setTimeout(r, 400 * (attempt + 1))); continue; } // too many requests
    if (json.error) throw new Error(`VK ${method}: ${json.error.error_code} ${json.error.error_msg}`);
    return json.response;
  }
}

async function fetchItems() {
  const items = [];
  for (let offset = 0; ; offset += 200) {
    const page = await call('market.get', {owner_id: -GROUP_ID, count: 200, offset, extended: 1});
    items.push(...page.items);
    if (items.length >= page.count || !page.items.length) return items;
  }
}

const translit = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
export function slugify(title) {
  return [...title.toLowerCase()].map(ch => translit[ch] ?? ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'rabota';
}

// The site groups works by technique; VK categories are shop categories, so guess from the text.
export function technique(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  if (/лоз|плетён|плетен|корзин/.test(text) && !/макраме/.test(text)) return 'Плетение';
  if (/вяза|вязан|крючк|спиц/.test(text)) return 'Вязание';
  return 'Макраме';
}

const largest = (photo) => photo.sizes.reduce((best, s) => (s.width * s.height > best.width * best.height ? s : best));

async function savePhoto(item, photo, index) {
  const file = path.join(PHOTOS, `${item.id}-${photo.id}.webp`);
  const src = '/' + file.replaceAll('\\', '/');
  if (!fs.existsSync(file) && !dry) {
    const res = await fetch(largest(photo).url);
    if (!res.ok) throw new Error(`Фото ${photo.id}: HTTP ${res.status}`);
    await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true}).webp({quality: 82}).toFile(file);
  }
  return {src, alt: `${item.title}, фото ${index + 1}`};
}

function existingWorks() {
  const byVk = new Map(), slugs = new Set();
  for (const name of fs.readdirSync(WORKS).filter(f => f.endsWith('.json'))) {
    const work = JSON.parse(fs.readFileSync(path.join(WORKS, name), 'utf8'));
    slugs.add(work.slug);
    if (work.vkId) byVk.set(work.vkId, work);
  }
  return {byVk, slugs};
}

const items = await fetchItems();
fs.mkdirSync(PHOTOS, {recursive: true});
const {byVk, slugs} = existingWorks();
const keepPhotos = new Set();
let created = 0, updated = 0;

for (const [index, item] of items.entries()) {
  const photos = item.photos ?? [];
  if (!photos.length) { console.warn(`Пропуск «${item.title}»: нет фото.`); continue; }
  const images = [];
  for (const [i, photo] of photos.slice(0, 12).entries()) images.push(await savePhoto(item, photo, i));
  images.forEach(img => keepPhotos.add(path.basename(img.src)));

  const previous = byVk.get(item.id);
  let slug = previous?.slug;
  if (!slug) { slug = slugify(item.title); for (let n = 2; slugs.has(slug); n++) slug = `${slugify(item.title)}-${n}`; slugs.add(slug); }
  const work = {
    slug,
    title: item.title.trim(),
    description: item.description?.trim() || item.title.trim(),
    category: previous?.category ?? technique(item),
    price: item.price?.text?.replace(/ /g, ' '),
    availability: item.availability === 0 ? undefined : 'Сейчас недоступно',
    images,
    vkId: item.id,
    vkUrl: `https://vk.ru/product-${-item.owner_id}_${item.id}`,
    published: previous?.published ?? item.availability !== 1,
    featured: previous?.featured ?? false,
    order: previous?.order ?? 200 + index,
  };
  const file = path.join(WORKS, `${slug}.json`);
  const next = JSON.stringify(work, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === next) continue;
  previous ? updated++ : created++;
  console.log(`${previous ? 'обновлено' : 'новое'}: ${work.title} → ${file}`);
  if (!dry) fs.writeFileSync(file, next);
}

// Removed from VK: hide the work but keep its file and photos, so a later return or a manual decision is possible.
const seen = new Set(items.map(item => item.id));
for (const [vkId, work] of byVk) {
  if (seen.has(vkId)) continue;
  work.images.forEach(img => keepPhotos.add(path.basename(img.src)));
  if (!work.published) continue;
  console.log(`скрыто (нет в VK): ${work.title}`);
  if (!dry) fs.writeFileSync(path.join(WORKS, `${work.slug}.json`), JSON.stringify({...work, published: false}, null, 2) + '\n');
}

// Photos replaced in VK.
for (const name of fs.readdirSync(PHOTOS)) {
  if (!keepPhotos.has(name)) { console.log(`удалено фото: ${name}`); if (!dry) fs.rmSync(path.join(PHOTOS, name)); }
}
console.log(`VK: ${items.length} товаров, новых ${created}, обновлено ${updated}${dry ? ' (пробный запуск)' : ''}.`);
