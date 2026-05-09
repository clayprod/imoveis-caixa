# Caixa Proxy — Cloudflare Worker

Resolve o bloqueio do WAF Azion da Caixa contra IPs de cloud (Hostinger).
O worker roda no edge da Cloudflare e faz a request à Caixa em nosso lugar.

## Deploy via dashboard (5 min, sem instalar nada)

1. Acessar https://dash.cloudflare.com — criar conta free (não exige cartão)
2. Menu lateral → **Workers & Pages** → **Create** → **Create Worker**
3. Nome sugerido: `imoveis-caixa-proxy` (a URL final fica `imoveis-caixa-proxy.<seu-subdomínio>.workers.dev`)
4. **Deploy** com o "Hello World" placeholder (você troca o código depois)
5. **Edit code** → apagar o conteúdo → colar o conteúdo de `worker/src/index.js` deste repo → **Save and Deploy**
6. Voltar pra página do worker → **Settings** → **Variables and Secrets**
   → **Add** → tipo **Secret** → nome `PROXY_TOKEN` → valor: o token que está em `.local-tools/proxy_token.txt` (40 chars)
7. Voltar e **redeploy** (não é automático após adicionar secret nessa UI)

## Validar

```bash
# health-check (não precisa token)
curl https://imoveis-caixa-proxy.<seu>.workers.dev/_health
# -> ok

# proxy real (precisa token + lookup do CSV)
curl -I -H "X-Proxy-Token: <token>" \
  https://imoveis-caixa-proxy.<seu>.workers.dev/listaweb/Lista_imoveis_geral.csv
# -> HTTP/2 200, Content-Length: ~11MB
```

## Configurar nosso backend

Adicionar ao `.env` (local e do VPS) — substituir `<seu>` pela URL real:

```
CAIXA_PROXY_URL=https://imoveis-caixa-proxy.<seu>.workers.dev
CAIXA_PROXY_TOKEN=<o token de proxy_token.txt>
```

Depois rodar:

```bash
# no VPS
docker build -t imoveis-ingest:latest -f /opt/imoveis-caixa/app/Dockerfile.ingest /opt/imoveis-caixa/app
/opt/imoveis-caixa/run-ingest.sh
```

## Deploy via wrangler CLI (alternativa, se preferir CLI)

```bash
cd worker
npm i -g wrangler
wrangler login
wrangler deploy
wrangler secret put PROXY_TOKEN  # cola o token
```

## Custos

- Free tier: 100.000 req/dia, 10ms CPU por req
- Nosso uso: 2 baixadas/dia + ~50.000 páginas detalhe num período de horas (Fase 2)
- Margem confortável; se passar do free, plano Workers Paid é US$ 5/mês com 10M req/mês
