import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)), base: './', server: { port: 5173, strictPort: true, proxy: {'/api':{target:process.env.ELDORIA_PROXY_TARGET??'http://127.0.0.1:2567'},'/online': {target: process.env.ELDORIA_PROXY_TARGET ?? 'http://127.0.0.1:2567', ws: true, rewrite: path => path.replace(/^\/online/, '')}} }, build: { outDir: 'dist', emptyOutDir: true } });
