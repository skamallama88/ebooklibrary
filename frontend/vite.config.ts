import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'lucide-react'],
          'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
          'epub-vendor': ['epubjs'],
          'data-vendor': ['@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual', 'axios']
        }
      }
    }
  }
})
