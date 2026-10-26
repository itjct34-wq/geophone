/**
 * Optional free AI brief for OSINT scan results.
 * Prefers Groq (OpenAI-compatible) when a key is available from ai_settings DB or GROQ_API_KEY;
 * falls back to Ollama at OLLAMA_BASE_URL / saved base URL when reachable.
 * Keys never leave the server.
 */

import { resolveAiConfig, maskSecret, type AiRuntimeConfig } from './_lib/aiSettings';

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end?: () => void };
}

const TIMEOUT_MS = 25_000;
const UA = 'GeoPhoneAI/1.0 (+https://github.com/itjct34-wq/geophone)';

type BriefBody = {
  target?: string;
  targetType?: string;
  modules?: Array<{ name?: string; status?: string; summary?: string }>;
  events?: Array<{ type?: string; data?: string; module?: string }>;
};

function asBody(raw: unknown): BriefBody {
  if (!raw || typeof raw !== 'object') return {};
  return raw as BriefBody;
}

function buildPrompt(body: BriefBody): string {
  const modules = (body.modules || [])
    .slice(0, 40)
    .map((m) => `- [${m.status || '?'}] ${m.name || 'module'}: ${m.summary || ''}`)
    .join('\n');
  const events = (body.events || [])
    .slice(0, 60)
    .map((e) => `- ${e.type || 'EVENT'}: ${e.data || ''} (${e.module || ''})`)
    .join('\n');

  return [
    'You are a careful OSINT analyst assistant for GeoPhone.',
    'Summarize public/open-source findings only. Do not invent private data.',
    'Never claim covert tracking or that a phone was located without consent.',
    'Respond in plain English with these sections:',
    '1) Brief overview (3-5 sentences)',
    '2) Key findings (bullets)',
    '3) Suggested next checks (bullets)',
    '4) Risk / confidence notes (bullets)',
    '',
    `Target: ${body.target || 'unknown'} (${body.targetType || 'auto'})`,
    '',
    'Modules:',
    modules || '(none)',
    '',
    'Events:',
    events || '(none)',
  ].join('\n');
}

async function callGroq(
  prompt: string,
  cfg: AiRuntimeConfig,
): Promise<{ ok: true; text: string; provider: string; model: string } | { ok: false; error: string }> {
  const key = cfg.groqApiKey;
  if (!key) return { ok: false, error: 'GROQ_API_KEY not set' };
  const model = cfg.groqModel || 'llama-3.1-8b-instant';
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: 'system', content: 'You write concise, ethical OSINT briefs for investigators.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;
    if (!response.ok) {
      return { ok: false, error: json?.error?.message || `Groq HTTP ${response.status}` };
    }
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: 'Groq returned an empty brief.' };
    return { ok: true, text, provider: 'groq', model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Groq request failed' };
  }
}

async function callOllama(
  prompt: string,
  cfg: AiRuntimeConfig,
): Promise<{ ok: true; text: string; provider: string; model: string } | { ok: false; error: string }> {
  const base = cfg.ollamaBaseUrl || 'http://localhost:11434';
  const model = cfg.ollamaModel || 'llama3.2';
  try {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: 'You write concise, ethical OSINT briefs for investigators.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await response.json().catch(() => null)) as {
      message?: { content?: string };
      error?: string;
    } | null;
    if (!response.ok) {
      return { ok: false, error: json?.error || `Ollama HTTP ${response.status}` };
    }
    const text = json?.message?.content?.trim();
    if (!text) return { ok: false, error: 'Ollama returned an empty brief.' };
    return { ok: true, text, provider: 'ollama', model };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Ollama unreachable at ${base}: ${err.message}`
          : `Ollama unreachable at ${base}`,
    };
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');

  const cfg = await resolveAiConfig();

  if ((req.method || 'GET').toUpperCase() === 'GET') {
    const groq = Boolean(cfg.groqApiKey);
    const ollamaBase = cfg.ollamaBaseUrl;
    let ollama = false;
    try {
      const ping = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(2500) });
      ollama = ping.ok;
    } catch {
      ollama = false;
    }
    res.status(200).json({
      groq,
      ollama,
      groqModel: cfg.groqModel,
      ollamaModel: cfg.ollamaModel,
      ollamaBase,
      groqSource: cfg.groqSource,
      groqKeyMasked: maskSecret(cfg.groqApiKey),
      ready: groq || ollama,
      message: groq
        ? cfg.groqSource === 'db'
          ? 'Groq is configured (Admin → AI setup).'
          : 'Groq is configured (env).'
        : ollama
          ? 'Ollama is reachable.'
          : 'Add a Groq key in Admin → AI setup, or set GROQ_API_KEY / run Ollama.',
    });
    return;
  }

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ error: 'Use GET for status or POST for a brief.' });
    return;
  }

  const body = asBody(req.body);
  if (!body.target || typeof body.target !== 'string') {
    res.status(400).json({ error: 'POST JSON with target and optional modules/events.' });
    return;
  }

  const prompt = buildPrompt(body);
  const groq = await callGroq(prompt, cfg);
  if (groq.ok) {
    res.status(200).json({ brief: groq.text, provider: groq.provider, model: groq.model });
    return;
  }

  const ollama = await callOllama(prompt, cfg);
  if (ollama.ok) {
    res.status(200).json({
      brief: ollama.text,
      provider: ollama.provider,
      model: ollama.model,
      groqSkipped: groq.error,
    });
    return;
  }

  res.status(503).json({
    configured: false,
    error: 'No AI backend available.',
    groq: groq.error,
    ollama: ollama.error,
    hint: 'Open Admin → AI setup to save a Groq key, or set GROQ_API_KEY / start Ollama.',
  });
}
