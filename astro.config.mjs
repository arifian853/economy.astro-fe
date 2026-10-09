// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
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
