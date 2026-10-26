import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
}

/** Default per-request budget so auth / RLS stalls cannot freeze the SPA forever. */
const SUPABASE_FETCH_MS = 15_000;

export const supabase = createClient<Database>(url, key, {
  global: {
    fetch: async (input, init) => {
      const controller = new AbortController();
      const external = init?.signal;
      const onExternalAbort = () => controller.abort(external?.reason);
      if (external) {
        if (external.aborted) controller.abort(external.reason);
        else external.addEventListener('abort', onExternalAbort, { once: true });
      }
      const timer = setTimeout(() => controller.abort(new DOMException('Supabase request timed out', 'TimeoutError')), SUPABASE_FETCH_MS);
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
        external?.removeEventListener('abort', onExternalAbort);
      }
    },
  },
});
