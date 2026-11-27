import { useEffect, useState } from 'react';

// Single place for the Flask API location so it can be made configurable later.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'
).replace(/\/$/, '');
export const REFRESH_INTERVAL_MS = 30000;
export const REQUEST_TIMEOUT_MS = 10000;

const initialState = { data: undefined, loading: true, failed: false, stale: false, lastRefresh: null };

// Polls a Flask endpoint so every browser shows the same database values.
// - data stays undefined until the first successful response.
// - failed is true only when nothing has loaded yet.
// - stale is true when a refresh fails after data loaded; the last good data is kept.
// mapResponse must be a stable (module-level) function.
export function usePolledApi(path, mapResponse, intervalMs = REFRESH_INTERVAL_MS) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    let inFlight = null;

    async function load() {
      if (inFlight) return; // Never stack requests if the API is slow.
      const controller = new AbortController();
      inFlight = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const body = await res.json();
        if (!Array.isArray(body)) throw new Error('Unexpected API response');
        const data = mapResponse(body);
        if (!cancelled) setState({ data, loading: false, failed: false, stale: false, lastRefresh: new Date() });
      } catch {
        if (!cancelled) {
          setState(current => {
            const hasData = current.data !== undefined;
            return { ...current, loading: false, failed: !hasData, stale: hasData };
          });
        }
      } finally {
        clearTimeout(timeout);
        if (inFlight === controller) inFlight = null;
      }
    }

    load();
    const timer = setInterval(load, intervalMs);
    // Catch up right away when the tab comes back into view.
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      inFlight?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [path, mapResponse, intervalMs]);

  return state;
}
