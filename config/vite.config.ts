import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react({
    // Enable React Fast Refresh
    fastRefresh: true,
    // Optimize JSX compilation
    jsxImportSource: 'react'
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@/components': path.resolve(__dirname, '../src/components'),
      '@/pages': path.resolve(__dirname, '../src/pages'),
      '@/services': path.resolve(__dirname, '../src/services'),
      '@/contexts': path.resolve(__dirname, '../src/contexts'),
      '@/types': path.resolve(__dirname, '../src/types'),
      '@/utils': path.resolve(__dirname, '../src/utils'),
      '@/hooks': path.resolve(__dirname, '../src/hooks'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false
      }
    },
    // Enable HMR
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimized manual chunking for better caching
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // Routing
          'router': ['react-router-dom'],
          // Charts library (heavy dependency)
          'charts': ['recharts'],
          // Icons library
          'icons': ['lucide-react']
        },
        // Optimize file naming for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'images/[name]-[hash][extname]';
          }
          if (/css/i.test(extType)) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      },
      // Enable tree shaking
      treeshake: {
        moduleSideEffects: false
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      },
      format: {
        // Remove comments
        comments: false
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Report bundle size
    reportCompressedSize: true
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react'
    ],
    exclude: [
      // Large libraries that benefit from dynamic imports
      'recharts'
    ]
  },
  // Enable performance monitoring in development
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PERFORMANCE_MONITORING__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
})