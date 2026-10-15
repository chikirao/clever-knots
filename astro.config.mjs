import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL || 'https://cleverknots.ru',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  integrations: [react()],
  vite: { plugins: [tailwind()] },
  prefetch: { defaultStrategy: 'viewport' },
});
