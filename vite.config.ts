import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin, type Connect} from 'vite';

type ApiHandler = (
  req: {query: Record<string, string>},
  res: {status: (code: number) => {json: (body: unknown) => void}; setHeader?: (name: string, value: string) => void},
) => Promise<void>;

/** Serves selected `/api/*` handlers in `vite dev` the same way Vercel does in production. */
function devApiPlugin(env: Record<string, string>): Plugin {
  const mount = (
    server: {middlewares: Connect.Server; ssrLoadModule: (url: string) => Promise<Record<string, unknown>>},
    route: string,
    modulePath: string,
    envKeys: string[],
  ) => {
    server.middlewares.use(route, async (req, res) => {
      for (const key of envKeys) {
        if (env[key]) process.env[key] = env[key];
      }
      try {
        const mod = await server.ssrLoadModule(modulePath);
        const handler = mod.default as ApiHandler | undefined;
        if (typeof handler !== 'function') {
          throw new Error(`Dev API module ${modulePath} has no default export.`);
        }
        const query = Object.fromEntries(new URL(req.url ?? '', 'http://localhost').searchParams);
        await handler(
          {query},
          {
            setHeader: (name: string, value: string) => {
              res.setHeader(name, value);
            },
            status: (code: number) => ({
              json: (body: unknown) => {
                res.statusCode = code;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(body));
              },
            }),
          },
        );
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({error: err instanceof Error ? err.message : 'Dev API handler failed.'}));
      }
    });
  };

  return {
    name: 'dev-api-handlers',
    configureServer(server) {
      const api = {
        middlewares: server.middlewares,
        ssrLoadModule: (url: string) => server.ssrLoadModule(url) as Promise<Record<string, unknown>>,
      };
      mount(api, '/api/cell', '/api/cell.ts', ['OPENCELLID_KEY', 'UNWIREDLABS_TOKEN']);
      mount(api, '/api/geocode', '/api/geocode.ts', ['OPENCAGE_KEY']);
      mount(api, '/api/phone-scan', '/api/phone-scan.ts', [
        'NUMVERIFY_API_KEY',
        'ABSTRACTAPI_PHONE_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
      ]);
      // Consolidated into phone-scan / sherlock / osint (Hobby ≤12 functions).
      mount(api, '/api/caller-check', '/api/phone-scan.ts', [
        'NUMVERIFY_API_KEY',
        'ABSTRACTAPI_PHONE_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
      ]);
      mount(api, '/api/sherlock', '/api/sherlock.ts', []);
      mount(api, '/api/holehe', '/api/sherlock.ts', []);
      mount(api, '/api/shodan', '/api/shodan.ts', ['SHODAN_API_KEY']);
      mount(api, '/api/public-api', '/api/osint.ts', [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]);
      mount(api, '/api/osint', '/api/osint.ts', [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SHODAN_API_KEY',
        'ABUSEIPDB_API_KEY',
        'BREACHDIRECTORY_API_KEY',
        'RAPIDAPI_KEY',
        'HUNTER_API_KEY',
        'VIRUSTOTAL_API_KEY',
        'APIVOID_API_KEY',
        'OTX_API_KEY',
        'WIGLE_API_NAME',
        'WIGLE_API_TOKEN',
      ]);
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
