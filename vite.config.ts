import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// Serves /api/cell in `vite dev` with the same handler Vercel runs in production.
function devApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api-cell',
    configureServer(server) {
      server.middlewares.use('/api/cell', async (req, res) => {
        if (env.OPENCELLID_KEY) process.env.OPENCELLID_KEY = env.OPENCELLID_KEY;
        const {default: handler} = await server.ssrLoadModule('/api/cell.ts');
        const query = Object.fromEntries(new URL(req.url ?? '', 'http://localhost').searchParams);
        await handler(
          {query},
          {
            status: (code: number) => ({
              json: (body: unknown) => {
                res.statusCode = code;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(body));
              },
            }),
          },
        );
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), devApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
