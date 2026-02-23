import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  base,
  
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
