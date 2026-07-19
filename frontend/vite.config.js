import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
            return 'react';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide';
          }
          if (id.includes('node_modules/axios')) {
            return 'axios';
          }
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    logLevel: 'warn',
    hmr: {
      overlay: false,
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        autoRewrite: true,
        protocolRewrite: 'http',
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        autoRewrite: true,
        protocolRewrite: 'http',
      },
    },
  },
})