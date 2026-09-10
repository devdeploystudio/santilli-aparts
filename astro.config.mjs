// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: reemplazar por el dominio real una vez que esté definido/comprado.
  site: 'https://www.santilliaparts.com.ar',
  integrations: [preact(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});