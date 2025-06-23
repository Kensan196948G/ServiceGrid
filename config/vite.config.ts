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
    port: 3001,
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
    },
    // Configure middleware for IP restrictions
    middlewareMode: false,
    // Custom middleware to restrict access to local networks only
    configureServer(server) {
      server.middlewares.use('/', (req, res, next) => {
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection?.remoteAddress || 
                        req.socket?.remoteAddress ||
                        req.ip;
        
        // Extract actual IP from potential IPv6 mapped format
        const actualIP = String(clientIP).replace(/^::ffff:/, '');
        
        // Allow localhost and private IP ranges
        const isLocalhost = actualIP === '127.0.0.1' || actualIP === '::1' || actualIP === 'localhost';
        const isPrivateIPv4 = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(actualIP);
        const isPrivateIPv6 = /^(fe80:|fd|fc)/.test(actualIP);
        const isLinkLocal = /^169\.254\./.test(actualIP); // Link-local addresses
        
        if (isLocalhost || isPrivateIPv4 || isPrivateIPv6 || isLinkLocal) {
          next();
        } else {
          console.warn(`🚫 Access denied from IP: ${actualIP} (not in allowed ranges)`);
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>アクセス拒否 - ServiceGrid ITSM</title>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Yu Gothic', sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e74c3c; margin-bottom: 20px; }
                p { color: #666; line-height: 1.6; }
                .ip { font-family: monospace; background: #f8f9fa; padding: 5px 10px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🔒 アクセス拒否</h1>
                <p>このServiceGrid ITSMシステムは、セキュリティ上の理由により<strong>ローカルネットワークからのアクセスのみ</strong>を許可しています。</p>
                <p>あなたのIPアドレス: <span class="ip">${actualIP}</span></p>
                <p>許可されているアクセス範囲:</p>
                <ul style="text-align: left; color: #666;">
                  <li>localhost (127.0.0.1, ::1)</li>
                  <li>プライベートIPアドレス (10.x.x.x, 172.16-31.x.x, 192.168.x.x)</li>
                  <li>リンクローカルアドレス (169.254.x.x)</li>
                </ul>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">ServiceGrid ITSM Platform - セキュリティ保護</p>
              </div>
            </body>
            </html>
          `);
        }
      });
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