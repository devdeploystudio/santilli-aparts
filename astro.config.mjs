// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://santilliaparts.com.ar',
  integrations: [
    preact(),
    sitemap({
      // /editor es la sección interna de edición, no un contenido para
      // buscar en Google: no tiene sentido que aparezca en el sitemap.
      filter: (page) => !page.includes('/editor'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});