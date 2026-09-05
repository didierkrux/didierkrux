import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.didierkrux.com',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    react(),
    sitemap({ filter: (page) => !page.includes('/og/') }),
  ],
});
