import type {APIRoute} from 'astro';
import {works,href} from '../lib/content';
export const GET:APIRoute=({site})=>{const urls=['','works/','about/',...works.map(w=>`works/${w.slug}/`)];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${new URL(href(url),site).href}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});};
