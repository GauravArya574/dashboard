import { GatewayConfig, NetworkMode } from '../types';

/**
 * Attempts to extract local IPv4 network interface addresses via WebRTC ICE Candidates.
 */
export async function detectLocalIpViaWebRTC(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        (window as unknown as { webkitRTCPeerConnection?: typeof window.RTCPeerConnection }).webkitRTCPeerConnection ||
        (window as unknown as { mozRTCPeerConnection?: typeof window.RTCPeerConnection }).mozRTCPeerConnection;

      if (!RTCPeerConnection) {
        return resolve(null);
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      let detectedIp: string | null = null;
      let resolved = false;

      const finish = (ip: string | null) => {
        if (!resolved) {
          resolved = true;
          try {
            pc.close();
          } catch {
            // ignore
          }
          resolve(ip);
        }
      };

      // Timeout after 1.8 seconds if WebRTC is blocked or mDNS masked
      const timer = setTimeout(() => {
        finish(detectedIp);
      }, 1800);

      pc.createDataChannel('gateway-detect');

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          return;
        }

        const candidateStr = event.candidate.candidate;
        // Search for IPv4 patterns
        const ipv4Regex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
        const match = candidateStr.match(ipv4Regex);

        if (match && match[1]) {
          const ip = match[1];
          // Check if private IP range
          if (
            ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            /^(172\.(1[6-9]|2[0-9]|3[0-1]))\./.test(ip)
          ) {
            detectedIp = ip;
            clearTimeout(timer);
            finish(ip);
          }
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timer);
          finish(null);
        });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Derives the typical default gateway IP from a local device IP
 * e.g., "192.168.1.145" -> "192.168.1.1", "10.0.0.32" -> "10.0.0.1"
 */
export function deriveGatewayFromIp(localIp: string): string {
  const parts = localIp.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
  }
  return '192.168.1.1';
}

/**
 * Checks connectivity to a local gateway or host via lightweight image probe or fetch
 */
export async function probeHostReachable(
  hostUrl: string,
  timeoutMs: number = 2000
): Promise<{ reachable: boolean; latencyMs: number }> {
  const startTime = performance.now();

  return new Promise((resolve) => {
    let resolved = false;

    const cleanupAndResolve = (reachable: boolean) => {
      if (!resolved) {
        resolved = true;
        const latencyMs = Math.round(performance.now() - startTime);
        resolve({ reachable, latencyMs });
      }
    };

    const timer = setTimeout(() => {
      cleanupAndResolve(false);
    }, timeoutMs);

    // 1. Try Image Probe (works across origins without CORS blocking errors crashing scripts)
    const img = new Image();
    const cleanUrl = hostUrl.replace(/\/+$/, '');
    img.src = `${cleanUrl}/favicon.ico?_t=${Date.now()}`;

    img.onload = () => {
      clearTimeout(timer);
      cleanupAndResolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      // If error triggered quickly (< timeout), it usually means TCP port responded / rejected (device is online!)
      const timeElapsed = performance.now() - startTime;
      if (timeElapsed < timeoutMs - 50) {
        cleanupAndResolve(true);
      } else {
        cleanupAndResolve(false);
      }
    };

    // 2. Parallel Fetch Probe with AbortController
    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), timeoutMs);

      fetch(hostUrl, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
      })
        .then(() => {
          clearTimeout(fetchTimer);
          clearTimeout(timer);
          cleanupAndResolve(true);
        })
        .catch((err) => {
          clearTimeout(fetchTimer);
          // If aborted by timeout -> offline. If TypeError due to network/CORS but before timeout -> reachable device!
          if (err.name !== 'AbortError') {
            const timeElapsed = performance.now() - startTime;
            if (timeElapsed < timeoutMs - 80) {
              cleanupAndResolve(true);
            }
          }
        });
    }
  });
}

/**
 * Full Gateway and Home Wi-Fi Detection Routine
 */
export async function performGatewayDetection(
  config: GatewayConfig
): Promise<Partial<GatewayConfig>> {
  let isHome = false;
  let detectedIp: string | undefined;
  let detectedGateway: string | undefined;
  let latency: number | undefined;
  let method: GatewayConfig['detectionMethod'] = 'probe';

  // 1. WebRTC Local IP scan
  try {
    const webrtcIp = await detectLocalIpViaWebRTC();
    if (webrtcIp) {
      detectedIp = webrtcIp;
      detectedGateway = deriveGatewayFromIp(webrtcIp);
      method = 'webrtc';

      // Check if matches configured Home subnet
      if (
        (config.homeSubnetPrefix && webrtcIp.startsWith(config.homeSubnetPrefix)) ||
        (config.homeGatewayIp && detectedGateway === config.homeGatewayIp)
      ) {
        isHome = true;
      }
    }
  } catch {
    // Continue to next probe method
  }

  // 2. Local Gateway HTTP / Image Probe
  const targetProbeHost = config.probeLocalHost || `http://${config.homeGatewayIp || '192.168.1.1'}`;
  try {
    const probeResult = await probeHostReachable(targetProbeHost, 2000);
    latency = probeResult.latencyMs;

    if (probeResult.reachable) {
      isHome = true;
      method = detectedIp ? 'hybrid' : 'probe';
      if (!detectedGateway) {
        detectedGateway = config.homeGatewayIp || '192.168.1.1';
      }
    }
  } catch {
    // Ignore probe failures
  }

  // 3. Server-side Network API check
  if (!isHome) {
    try {
      const resp = await fetch('/api/network-detect');
      if (resp.ok) {
        const data = await resp.json();
        if (data.isPrivateIp) {
          isHome = true;
          detectedIp = detectedIp || data.clientIp;
          detectedGateway = detectedGateway || (data.clientIp ? deriveGatewayFromIp(data.clientIp) : '192.168.1.1');
          method = 'server';
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    isHomeWifiDetected: isHome,
    detectedGateway: detectedGateway || config.homeGatewayIp || '192.168.1.1',
    detectedLocalIp: detectedIp || (isHome ? `${config.homeGatewayIp.slice(0, -1)}100` : undefined),
    probeLatencyMs: latency,
    detectionMethod: method,
    lastDetectedAt: Date.now(),
  };
}

/**
 * Returns the active URL for a service based on current network mode and detected environment
 */
export function getActiveServiceUrl(
  service: { localUrl: string; remoteUrl: string },
  mode: NetworkMode,
  isHomeDetected: boolean
): { url: string; isLocal: boolean; label: 'LAN' | 'WAN' } {
  if (mode === 'home') {
    return { url: service.localUrl || service.remoteUrl, isLocal: true, label: 'LAN' };
  }
  if (mode === 'remote') {
    return { url: service.remoteUrl || service.localUrl, isLocal: false, label: 'WAN' };
  }
  // Auto mode
  if (isHomeDetected) {
    return { url: service.localUrl || service.remoteUrl, isLocal: true, label: 'LAN' };
  }
  return { url: service.remoteUrl || service.localUrl, isLocal: false, label: 'WAN' };
}
