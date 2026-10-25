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
    server: {middlewares: Connect.Server; ssrLoadModule: (url: string) => Promise<{default: ApiHandler}>},
    route: string,
    modulePath: string,
    envKeys: string[],
  ) => {
    server.middlewares.use(route, async (req, res) => {
      for (const key of envKeys) {
        if (env[key]) process.env[key] = env[key];
      }
      try {
        const {default: handler} = await server.ssrLoadModule(modulePath);
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
      mount(server, '/api/cell', '/api/cell.ts', ['OPENCELLID_KEY', 'UNWIREDLABS_TOKEN']);
      mount(server, '/api/geocode', '/api/geocode.ts', ['OPENCAGE_KEY']);
      mount(server, '/api/phone-scan', '/api/phone-scan.ts', [
        'NUMVERIFY_API_KEY',
        'ABSTRACTAPI_PHONE_KEY',
      ]);
      mount(server, '/api/caller-check', '/api/caller-check.ts', [
        'NUMVERIFY_API_KEY',
        'ABSTRACTAPI_PHONE_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
      ]);
      mount(server, '/api/sherlock', '/api/sherlock.ts', []);
      mount(server, '/api/holehe', '/api/holehe.ts', []);
      mount(server, '/api/shodan', '/api/shodan.ts', ['SHODAN_API_KEY']);
      mount(server, '/api/osint', '/api/osint.ts', [
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
