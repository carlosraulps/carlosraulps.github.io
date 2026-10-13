import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../resources',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion', 'gsap'],
          icons: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    fs: {
      allow: ['..'],
    },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
