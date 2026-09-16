// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://santilliaparts.com.ar',
  integrations: [preact(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});