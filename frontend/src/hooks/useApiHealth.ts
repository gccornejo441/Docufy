import * as React from "react";

export type ApiHealthStatus = "checking" | "ok" | "down";

export interface UseApiHealthOptions {
  /** How often to re-check (ms). Default: 30_000 */
  intervalMs?: number;
  /** Per-request timeout (ms). Default: 4_000 */
  timeoutMs?: number;
  /** Paths to probe in order. Default: ["/health", "/status", "/"] */
  paths?: string[];
}

export interface ApiHealthResult {
  status: ApiHealthStatus;
  statusCode: number | null;
  latencyMs: number | null;
  lastChecked: number | null;
  check: () => Promise<void>;
}

const DEFAULT_PATHS = ["/health", "/status", "/"];

export default function useApiHealth(
  apiBase: string,
  opts: UseApiHealthOptions = {}
): ApiHealthResult {
  const intervalMs = opts.intervalMs ?? 30_000;
  const timeoutMs = opts.timeoutMs ?? 4_000;

  const paths = React.useMemo(() => opts.paths ?? DEFAULT_PATHS, [opts.paths]);

  const [status, setStatus] = React.useState<ApiHealthStatus>("checking");
  const [statusCode, setStatusCode] = React.useState<number | null>(null);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);
  const [lastChecked, setLastChecked] = React.useState<number | null>(null);

  const check = React.useCallback(async () => {
    try {
      const base = (apiBase || window.location.origin).replace(/\/$/, "");
      const candidates = paths.map((p) => `${base}${p.startsWith("/") ? p : `/${p}`}`);

      setStatus("checking");

      let ok = false;
      let code: number | null = null;
      let latency: number | null = null;

      const fetchWithTimeout = async (url: string) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const t0 = Date.now();
        try {
          const res = await fetch(url, {
            method: "GET",
            signal: ctrl.signal,
            cache: "no-store",
          });
          code = res.status;
          latency = Date.now() - t0;
          if (res.ok) ok = true;
        } finally {
          clearTimeout(timer);
        }
      };

      for (const url of candidates) {
        try {
          await fetchWithTimeout(url);
          if (ok) break;
        } catch {
          // ignore
        }
      }

      setStatusCode(code);
      setLatencyMs(latency);
      setStatus(ok ? "ok" : "down");
      setLastChecked(Date.now());
    } catch {
      setStatus("down");
      setLastChecked(Date.now());
    }
  }, [apiBase, timeoutMs, paths]); 

  React.useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { status, statusCode, latencyMs, lastChecked, check };
}
