const MAX_ATTEMPTS = 8;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 3_000;
const CACHE_TTL_MS = 60 * 60 * 1_000;

type ReadinessOptions = {
  apiUrl: string;
  onReady: () => void;
  onUnavailable: () => void;
};

export function checkServerReadiness({ apiUrl, onReady, onUnavailable }: ReadinessOptions) {
  const cacheKey = `serverready:${apiUrl}`;
  let stopped = false;
  let attempts = 0;
  let controller: AbortController | undefined;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    stopped = true;
    clearTimeout(requestTimer);
    clearTimeout(retryTimer);
    controller?.abort();
  };

  // Storage can be unavailable in private/restricted browsing. It is optional.
  try {
    if (Number(window.localStorage.getItem(cacheKey)) > Date.now()) {
      onReady();
      return stop;
    }
  } catch { /* Continue with a network check. */ }

  async function check() {
    if (stopped) return;
    attempts += 1;
    controller = new AbortController();
    requestTimer = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
    let ready = false;
    try {
      const response = await fetch(`${apiUrl}/ping`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const data = response.ok ? await response.json() : null;
      ready = data?.serverready === true;
    } catch { /* Timeouts, network failures and invalid responses are retried. */ }
    finally { clearTimeout(requestTimer); }

    if (stopped) return;
    if (ready) {
      try { window.localStorage.setItem(cacheKey, String(Date.now() + CACHE_TTL_MS)); }
      catch { /* A failed cache write must not prevent access to a ready server. */ }
      onReady();
    } else if (attempts < MAX_ATTEMPTS) {
      retryTimer = setTimeout(() => void check(), RETRY_DELAY_MS);
    } else {
      onUnavailable();
    }
  }

  void check();
  return stop;
}
