import { DockerService, ServiceStatus } from '../types';

/**
 * Direct browser probe for standalone static hosting environments (e.g. Cloudflare Pages, Netlify, Vercel Static, S3).
 * Uses fetch with no-cors mode, custom CORS proxy, falling back to DOM image probing.
 */
async function probeDirectBrowser(
  targetUrl: string,
  timeoutMs: number = 4000,
  pingProxyUrl?: string
): Promise<{
  online: boolean;
  latency: number;
  statusCode?: number;
  message?: string;
}> {
  const startTime = performance.now();
  const isHttpsDashboard = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpTarget = targetUrl.startsWith('http://');

  // If a custom CORS/ping proxy URL is configured in settings, route through it
  if (pingProxyUrl?.trim()) {
    try {
      const proxyBase = pingProxyUrl.trim();
      const fullProxyUrl = proxyBase.includes('{url}')
        ? proxyBase.replace('{url}', encodeURIComponent(targetUrl))
        : `${proxyBase.endsWith('/') || proxyBase.endsWith('?') ? proxyBase : proxyBase + '?'}${encodeURIComponent(targetUrl)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(fullProxyUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        return { online: true, latency, statusCode: res.status, message: `Proxy HTTP ${res.status}` };
      }
    } catch {
      // Fallback to direct browser probe if proxy attempt fails
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Attempt standard fetch with no-cors to handle cross-origin services gracefully
    await fetch(targetUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
      credentials: 'omit',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    return {
      online: true,
      latency,
      message: 'Reachable',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorObj = err as { name?: string };
    if (errorObj?.name === 'AbortError') {
      return {
        online: false,
        latency: Math.round(performance.now() - startTime),
        message: 'Timeout (> 4s)',
      };
    }

    // Secondary fallback: DOM element probe (favicons/images often bypass strict fetch restrictions)
    return new Promise((resolve) => {
      const imgStartTime = performance.now();
      const img = new Image();
      let resolved = false;

      const finish = (online: boolean, msg: string) => {
        if (!resolved) {
          resolved = true;
          img.onload = null;
          img.onerror = null;
          resolve({
            online,
            latency: Math.round(performance.now() - imgStartTime),
            message: msg,
          });
        }
      };

      const fallbackTimer = setTimeout(() => {
        const defaultMsg = (isHttpsDashboard && isHttpTarget)
          ? 'Mixed Content (HTTPS page cannot ping HTTP target)'
          : 'Unreachable';
        finish(false, defaultMsg);
      }, 2500);

      img.onload = () => {
        clearTimeout(fallbackTimer);
        finish(true, 'Online');
      };

      img.onerror = () => {
        clearTimeout(fallbackTimer);
        const elapsed = performance.now() - imgStartTime;
        if (elapsed < 2000) {
          finish(true, 'Reachable');
        } else {
          const defaultMsg = (isHttpsDashboard && isHttpTarget)
            ? 'Mixed Content Block (HTTP URL on HTTPS dashboard)'
            : 'Unreachable';
          finish(false, defaultMsg);
        }
      };

      try {
        const parsed = new URL(targetUrl);
        parsed.pathname = '/favicon.ico';
        parsed.search = `_p=${Date.now()}`;
        img.src = parsed.toString();
      } catch {
        img.src = `${targetUrl}/favicon.ico?_p=${Date.now()}`;
      }
    });
  }
}

/**
 * Pings the remote URL of the service.
 * Supports full-stack setups (Node Express / Cloudflare Functions `/api/ping`) and static deployment environments.
 */
export async function pingService(
  service: DockerService,
  pingProxyUrl?: string
): Promise<ServiceStatus> {
  const targetUrl = service.remoteUrl?.trim() || service.localUrl?.trim();

  if (!targetUrl) {
    return {
      serviceId: service.id,
      state: 'offline',
      latencyMs: 0,
      lastChecked: Date.now(),
      message: 'No URL configured',
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    // 1. Attempt backend proxy API (/api/ping) - supported by Express server AND Cloudflare Pages Functions
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, timeout: 5500 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';

    // Verify response is valid JSON (prevents HTML SPA fallback parsing errors on static hosts)
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      const latency = data.latency || Math.round(performance.now() - startTime);
      const isOnline = Boolean(
        data.online && (!data.statusCode || (data.statusCode >= 200 && data.statusCode < 400))
      );

      return {
        serviceId: service.id,
        state: isOnline ? (latency > 5000 ? 'degraded' : 'online') : 'offline',
        statusCode: data.statusCode,
        latencyMs: latency,
        lastChecked: Date.now(),
        message: isOnline
          ? (data.statusCode ? `HTTP ${data.statusCode} OK` : 'Online')
          : (data.error || `HTTP Error ${data.statusCode || 'Failed'}`),
      };
    }

    // If server returned non-JSON (e.g. index.html SPA fallback) or 404/502/etc., fallback to direct browser probe
    const directResult = await probeDirectBrowser(targetUrl, 4000, pingProxyUrl);
    return {
      serviceId: service.id,
      state: directResult.online ? (directResult.latency > 5000 ? 'degraded' : 'online') : 'offline',
      latencyMs: directResult.latency,
      lastChecked: Date.now(),
      message: directResult.message || (directResult.online ? 'Online' : 'Offline'),
    };
  } catch {
    clearTimeout(timeoutId);
    try {
      const directResult = await probeDirectBrowser(targetUrl, 4000, pingProxyUrl);
      return {
        serviceId: service.id,
        state: directResult.online ? (directResult.latency > 5000 ? 'degraded' : 'online') : 'offline',
        latencyMs: directResult.latency,
        lastChecked: Date.now(),
        message: directResult.message || (directResult.online ? 'Online' : 'Offline'),
      };
    } catch {
      return {
        serviceId: service.id,
        state: 'offline',
        latencyMs: Math.round(performance.now() - startTime),
        lastChecked: Date.now(),
        message: 'Unreachable',
      };
    }
  }
}
