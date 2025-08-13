import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // en kilooctets (kB)
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // Set to true for HTTPS if your backend uses it
        // Optionally, you can rewrite the path if your backend expects a different path
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})
