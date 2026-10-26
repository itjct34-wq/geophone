/**
 * Race a promise against a hard deadline so Supabase / OSINT work cannot leave
 * the UI stuck in a forever-loading state when the network or RLS stalls.
 */

export class TimeoutError extends Error {
  constructor(ms: number, label = 'Operation') {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label = 'Operation',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(timeoutMs, label)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** Yield to the browser event loop so React can paint spinners / handle Cancel. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
