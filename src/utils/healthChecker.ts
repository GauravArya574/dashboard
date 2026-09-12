import { DockerService, ServiceStatus } from '../types';

/**
 * Pings ONLY the external (remote) URL of the service via the server probe proxy.
 * Eliminates random flapping caused by browser CORS opacity heuristic mismatches or local IP racing.
 */
export async function pingService(
  service: DockerService,
  _activeUrl?: string
): Promise<ServiceStatus> {
  // Only use the external (remote) URL as requested
  const targetUrl = service.remoteUrl?.trim();

  if (!targetUrl) {
    return {
      serviceId: service.id,
      state: 'offline',
      latencyMs: 0,
      lastChecked: Date.now(),
      message: 'No remote URL configured',
    };
  }

  const startTime = performance.now();
  const controller = new AbortController();
  // Allow full window for responses > 5000ms
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, timeout: 5500 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const latency = data.latency || Math.round(performance.now() - startTime);
      const isOnline = Boolean(data.online && (!data.statusCode || (data.statusCode >= 200 && data.statusCode < 400)));

      return {
        serviceId: service.id,
        state: isOnline ? (latency > 5000 ? 'degraded' : 'online') : 'offline',
        statusCode: data.statusCode,
        latencyMs: latency,
        lastChecked: Date.now(),
        message: isOnline ? (data.statusCode ? `HTTP ${data.statusCode} OK` : 'Online') : (data.error || `HTTP Error ${data.statusCode || 'Failed'}`),
      };
    }

    return {
      serviceId: service.id,
      state: 'offline',
      latencyMs: Math.round(performance.now() - startTime),
      lastChecked: Date.now(),
      message: 'Proxy Error ' + res.status,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorObj = err as { name?: string; message?: string };
    return {
      serviceId: service.id,
      state: 'offline',
      latencyMs: Math.round(performance.now() - startTime),
      lastChecked: Date.now(),
      message: errorObj?.name === 'AbortError' ? 'Probe timed out' : 'Unreachable',
    };
  }
}



