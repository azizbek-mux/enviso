import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build works from a GitHub Pages subpath
  // (https://user.github.io/repo/) without hardcoding the repo name.
  base: './',
  server: {
    // Honours an assigned PORT so a second instance can run alongside one
    // already serving on 3000; falls back to 3000 for the normal case.
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
  build: {
    target: 'es2022',
  },
});
