export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Fetch the requested path from static assets
    const response = await env.ASSETS.fetch(request);

    // Check if the request path targets a static asset file
    const isAsset = url.pathname.startsWith('/assets/') || /\.[a-zA-Z0-9]+$/.test(url.pathname);

    if (isAsset) {
      const contentType = response.headers.get('content-type') || '';
      // Prevent serving index.html as a module script for missing/stale /assets/* requests
      if (response.status === 404 || (contentType.includes('text/html') && !url.pathname.endsWith('.html'))) {
        return new Response('Asset not found', {
          status: 404,
          headers: { 'content-type': 'text/plain' },
        });
      }
      return response;
    }

    // For SPA client-side routes, serve index.html if asset fetch returns >= 400
    if (response.status >= 400) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
