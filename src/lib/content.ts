import { z } from 'zod';
import type { ImageMetadata } from 'astro';
import rawSite from '../content/site.json';

const workSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1), description: z.string().min(1),
  category: z.string().min(1), published: z.boolean(),
  featured: z.boolean().default(false), order: z.number().default(100),
  price: z.string().optional(), availability: z.string().optional(),
  vkId: z.number().int().optional(), vkUrl: z.url().optional(),
  images: z.array(z.object({src: z.string(), alt: z.string().min(1)})).min(1),
});
export type Work = z.infer<typeof workSchema>;
const entries = import.meta.glob('../content/works/*.json', {eager:true, import:'default'});
const assets = import.meta.glob<{default:ImageMetadata}>('/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif}', {eager:true});
const parsed = Object.values(entries).map(entry=>workSchema.parse(entry));
if (new Set(parsed.map(w=>w.slug)).size !== parsed.length) throw new Error('У работ должны быть разные slug.');
export const works = parsed.filter(w=>w.published).sort((a,b)=>a.order-b.order || a.title.localeCompare(b.title,'ru'));
export const site = z.object({name:z.literal('Clever Knots'),tagline:z.string(),heroNote:z.string(),introTitle:z.string(),introText:z.string(),aboutTitle:z.string(),aboutText:z.string(),contactTitle:z.string(),contactText:z.string(),vkUrl:z.url()}).parse(rawSite);
export function asset(src:string):ImageMetadata {
  const normalized = src.startsWith('/') ? src : `/${src}`;
  const img = assets[normalized]?.default;
  if (!img) throw new Error(`Фотография не найдена: ${src}`);
  return img;
}
export function href(path=''):string {return `${import.meta.env.BASE_URL.replace(/\/$/,'')}/${path.replace(/^\//,'')}`;}
