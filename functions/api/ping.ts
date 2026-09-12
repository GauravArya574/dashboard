// Cloudflare Pages Serverless Function for /api/ping
// Automatically recognized by Cloudflare Pages when deployed!

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost(context: { request: Request }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = (await context.request.json().catch(() => ({}))) as { url?: string; timeout?: number };
    const { url, timeout = 5500 } = body || {};

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid 'url' parameter" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL provided" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 1. First attempt HEAD request
    try {
      const resp = await fetch(parsedUrl.toString(), {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      const statusCode = resp.status;
      const isOnline = statusCode >= 200 && statusCode < 400;

      return new Response(
        JSON.stringify({
          online: isOnline,
          statusCode,
          latency,
          url,
          error: isOnline ? undefined : `HTTP Error ${statusCode}`,
          timestamp: Date.now(),
        }),
        { headers: corsHeaders }
      );
    } catch (headErr: any) {
      clearTimeout(timeoutId);

      if (headErr?.name === "AbortError") {
        return new Response(
          JSON.stringify({
            online: false,
            error: "Connection timed out",
            latency: timeout,
            url,
            timestamp: Date.now(),
          }),
          { headers: corsHeaders }
        );
      }

      // 2. Retry with GET if HEAD failed
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout);
      try {
        const getResp = await fetch(parsedUrl.toString(), {
          method: "GET",
          signal: getController.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
          },
          redirect: "follow",
        });
        clearTimeout(getTimeoutId);
        const latency = Date.now() - startTime;
        const statusCode = getResp.status;
        const isOnline = statusCode >= 200 && statusCode < 400;

        return new Response(
          JSON.stringify({
            online: isOnline,
            statusCode,
            latency,
            url,
            error: isOnline ? undefined : `HTTP Error ${statusCode}`,
            timestamp: Date.now(),
          }),
          { headers: corsHeaders }
        );
      } catch (getErr: any) {
        clearTimeout(getTimeoutId);
        return new Response(
          JSON.stringify({
            online: false,
            error: getErr?.message || "Unreachable",
            latency: Date.now() - startTime,
            url,
            timestamp: Date.now(),
          }),
          { headers: corsHeaders }
        );
      }
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
