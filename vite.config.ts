import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    // Nunca emitir sourcemaps em produção (evita expor o código-fonte no bundle)
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    // Vite 8 usa Rolldown: a divisão manual de chunks é feita por grupos
    // (o formato de objeto do `manualChunks` do Rollup não existe mais).
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor-firebase', test: /node_modules[\\/](firebase|@firebase|idb)[\\/]/ },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
})
