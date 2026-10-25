/**
 * Client for /api/ai-brief (Groq → Ollama). Never sends API keys from the browser.
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';

const STATUS_MS = 8_000;
const BRIEF_MS = 30_000;

export interface AiStatus {
  groq: boolean;
  ollama: boolean;
  groqModel: string;
  ollamaModel: string;
  ollamaBase: string;
  ready: boolean;
  message: string;
}

export interface AiBriefRequest {
  target: string;
  targetType?: string;
  modules?: Array<{ name?: string; status?: string; summary?: string }>;
  events?: Array<{ type?: string; data?: string; module?: string }>;
}

export interface AiBriefResult {
  brief?: string;
  provider?: string;
  model?: string;
  configured?: boolean;
  error?: string;
  hint?: string;
}

export async function fetchAiStatus(signal?: AbortSignal): Promise<AiStatus> {
  try {
    const response = await fetchWithTimeout(
      '/api/ai-brief',
      { headers: { Accept: 'application/json' }, signal },
      STATUS_MS,
    );
    const body = (await response.json().catch(() => null)) as AiStatus | null;
    if (!body) {
      return {
        groq: false,
        ollama: false,
        groqModel: '',
        ollamaModel: '',
        ollamaBase: '',
        ready: false,
        message: 'Could not read AI status.',
      };
    }
    return body;
  } catch (err) {
    return {
      groq: false,
      ollama: false,
      groqModel: '',
      ollamaModel: '',
      ollamaBase: '',
      ready: false,
      message: err instanceof Error ? err.message : 'AI status unavailable.',
    };
  }
}

export async function requestAiBrief(
  payload: AiBriefRequest,
  signal?: AbortSignal,
): Promise<AiBriefResult> {
  try {
    const response = await fetchWithTimeout(
      '/api/ai-brief',
      {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      },
      BRIEF_MS,
    );
    const body = (await response.json().catch(() => null)) as AiBriefResult | null;
    if (!body) return { error: `AI brief HTTP ${response.status}` };
    if (!response.ok) return { ...body, error: body.error || `HTTP ${response.status}` };
    return body;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI brief failed.' };
  }
}
