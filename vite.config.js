import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * `npm run dev` forwards API and media requests to the backend (`DEV_API_PROXY_TARGET` in `.env`), so the browser
 * only ever talks to the dev server and the backend's CORS rules never come into play. The `Origin` header is
 * dropped on the way: the backend refuses any request carrying an origin it doesn't list. Production does the same
 * in the host Nginx (deploy/nginx/ramellian-locations.conf).
 */
function devApiProxy(target) {
  if (!target) return undefined;
  const route = {
    target,
    changeOrigin: true,
    configure: (proxy) => proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin')),
  };
  return { '/api': route, '/uploads': route };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: devApiProxy(env.DEV_API_PROXY_TARGET),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        thresholds: {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        exclude: [
          'node_modules/**',
          'src/test/**',
          'src/mocks/**',
          'src/main.jsx',
          '**/*.config.*',
          '**/index.js',
        ],
      },
      include: ['src/**/*.test.{js,jsx}'],
      exclude: ['node_modules/**', 'dist/**'],
      testTimeout: 15000,
    },
  };
});
