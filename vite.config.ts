import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [svelte({ compilerOptions: { fragments: 'tree' } }), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist/ui',
    rollupOptions: { input: ['popup.html', 'gate.html'] },
  },
});
