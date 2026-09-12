import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Network detection endpoint: analyzes client IP and connection details
app.get("/api/network-detect", (req, res) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = typeof forwardedFor === "string" 
    ? forwardedFor.split(",")[0].trim() 
    : req.socket.remoteAddress || "127.0.0.1";

  // Check if client IP is private/local subnet
  const isPrivateIp = /^(::f{4}:)?(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|fe80::|::1)/.test(clientIp);

  res.json({
    clientIp,
    isPrivateIp,
    headers: {
      host: req.headers.host,
      userAgent: req.headers["user-agent"],
    },
    serverTime: Date.now(),
    serverInterfaces: os.networkInterfaces()
  });
});

// Mock / Live Docker Host Metrics
app.get("/api/docker-metrics", (_req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const uptime = os.uptime();

  res.json({
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: uptime,
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || "Docker Host CPU",
      loadAvg1m: loadAvg[0] ? Number(loadAvg[0].toFixed(2)) : 0.45,
      totalMemoryBytes: totalMem,
      usedMemoryBytes: usedMem,
      freeMemoryBytes: freeMem,
      memoryUsagePercent: Math.round((usedMem / totalMem) * 100),
    },
    docker: {
      version: "27.3.1",
      containersRunning: 14,
      containersTotal: 16,
      imagesTotal: 28,
      volumesTotal: 19,
      storageDriver: "overlay2",
    },
    timestamp: Date.now(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Homelab Dashboard] Server running on http://0.0.0.0:${PORT}`);
  });
}

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Rejection:", reason);
});

startServer().catch((err) => {
  console.error("[Server] Failed to start server:", err);
  process.exit(1);
});
