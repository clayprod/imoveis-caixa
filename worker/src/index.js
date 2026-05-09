/**
 * Cloudflare Worker — proxy reverso para venda-imoveis.caixa.gov.br
 *
 * Caixa (via Azion CDN) bloqueia o IP do nosso VPS.
 * Este worker roda no edge da Cloudflare, faz a request à Caixa com
 * User-Agent de browser real e devolve o conteúdo pro nosso backend.
 *
 * Auth: header X-Proxy-Token compartilhado (env var PROXY_TOKEN no Worker).
 * Sem isso o worker viraria um open proxy.
 */

const ORIGIN = "https://venda-imoveis.caixa.gov.br";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export default {
  async fetch(request, env) {
    // health-check sem auth
    const url = new URL(request.url);
    if (url.pathname === "/_health") {
      return new Response("ok", { status: 200 });
    }

    // auth obrigatória
    const expected = env.PROXY_TOKEN;
    if (!expected) {
      return new Response(
        "PROXY_TOKEN não configurada no Worker (Settings > Variables)",
        { status: 500 }
      );
    }
    const got = request.headers.get("X-Proxy-Token");
    if (got !== expected) {
      return new Response("forbidden", { status: 403 });
    }

    // só GET / HEAD por enquanto (Fase 1 só baixa CSV)
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed", { status: 405 });
    }

    const target = ORIGIN + url.pathname + url.search;
    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers: BROWSER_HEADERS,
        redirect: "follow",
      });
    } catch (err) {
      return new Response(`upstream error: ${err.message}`, { status: 502 });
    }

    // Stream-through, preservando Content-Type/Length.
    const headers = new Headers();
    const ct = upstream.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);
    const cl = upstream.headers.get("Content-Length");
    if (cl) headers.set("Content-Length", cl);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Proxy-Origin", "caixa-proxy");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
