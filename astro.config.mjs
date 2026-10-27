// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    // QA can run without reading local .env files. Normal development is unchanged.
    ...(process.env.ECONOMY_ENV_DIR ? { envDir: process.env.ECONOMY_ENV_DIR } : {}),
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      {
        name: 'event-route-fallback',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.startsWith('/event/') && !req.url.startsWith('/event/index') && !req.url.includes('.')) {
              req.url = '/event/index';
            }
            next();
          });
        },
      },
    ],
  },
});
