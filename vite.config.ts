import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: './src/ui',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: resolve(__dirname, 'src/ui/index.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
