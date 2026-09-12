// Cloudflare Pages Serverless Function for /api/docker-metrics

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      host: {
        hostname: "cloudflare-edge",
        platform: "Cloudflare Pages Worker",
        arch: "x86_64",
        uptimeSeconds: 86400,
        cpuCount: 8,
        cpuModel: "Cloudflare Edge vCPU",
        loadAvg1m: 0.15,
        totalMemoryBytes: 1073741824,
        usedMemoryBytes: 322122547,
        freeMemoryBytes: 751619277,
        memoryUsagePercent: 30,
      },
      docker: {
        version: "27.3.1 (Cloudflare)",
        containersRunning: 14,
        containersTotal: 16,
        imagesTotal: 28,
        volumesTotal: 19,
        storageDriver: "overlay2",
      },
      timestamp: Date.now(),
    }),
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  );
}
