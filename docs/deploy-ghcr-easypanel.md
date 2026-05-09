# Deploy via GHCR + EasyPanel

Fluxo desejado:

1. Push na `main`.
2. GitHub Actions builda `backend/Dockerfile` e `webhook/Dockerfile`.
3. Imagens publicadas:
   - `ghcr.io/clayprod/imoveis-caixa-ingest:latest`
   - `ghcr.io/clayprod/imoveis-caixa-webhook:latest`
   - `ghcr.io/clayprod/imoveis-caixa/imoveis-ingest:latest`
   - `ghcr.io/clayprod/imoveis-caixa/imoveis-webhook:latest`
4. EasyPanel recebe um webhook de deploy e puxa as imagens novas.

## Secrets no GitHub

Configurar em `Settings > Secrets and variables > Actions`:

- `EASYPANEL_DEPLOY_WEBHOOK_URL`: webhook de deploy do serviço no EasyPanel.

O publish no GHCR usa o `GITHUB_TOKEN` automático do Actions.

## Serviço no EasyPanel

Configurar o serviço worker/CLI com imagem:

```text
ghcr.io/clayprod/imoveis-caixa-ingest:latest
```

Configurar o serviço webhook/n8n com imagem:

```text
ghcr.io/clayprod/imoveis-caixa-webhook:latest
```

Variáveis necessárias:

```text
INGEST_IMAGE=ghcr.io/clayprod/imoveis-caixa-ingest:latest
DATABASE_URL=postgresql://...
GROQ_API_KEY=...
OPENAI_API_KEY=...
CAIXA_PROXY_URL=...
CAIXA_PROXY_TOKEN=...
NOMINATIM_URL=https://nominatim.openstreetmap.org
OCR_INITIAL_SAMPLE_SIZE=50
OCR_MAX_INPUT_CHARS=20000
PHOTO_DIR=/data/photos
EVOLUTION_INSTANCE_NAME=claytoncosta
N8N_DEFAULT_REMOTE_JID=
```

Para OCR, montar o volume de matrículas em `/data`.

## Webhooks internos para n8n

O serviço `webhook/` aciona containers efêmeros da imagem configurada em `INGEST_IMAGE`.
Endpoints disponíveis:

- `POST /trigger-ingest`
- `POST /trigger-scrape?limit=1000&concurrency=15&scope=pending`
- `POST /trigger-matriculas?limit=500&concurrency=5`
- `POST /trigger-photos?limit=500&concurrency=8`
- `POST /trigger-geocode?limit=50`
- `POST /trigger-ocr?limit=10`
- `POST /trigger-embed?limit=500&batch=50`
- `POST /trigger-neighborhoods?limit=20`

Todos exigem:

```text
Authorization: Bearer <WEBHOOK_TOKEN>
```

## Idempotência dos jobs

- Ingest: upsert por `numero_imovel` e soft-delete para removidos.
- Scrape: `pending` processa apenas imóveis sem detalhe.
- Matrículas: baixa apenas quando ainda não há linha em `matricula_extracts`.
- Fotos: baixa apenas registros de `property_photos` sem `local_path`.
- Geocode: processa apenas `geocoded_at IS NULL`.
- OCR: processa apenas `ocr_text IS NULL`, limitado a amostra inicial e imóveis que batem em watchlist ativa.
- Embeddings: processa apenas imóveis sem linha em `property_embeddings`.
- Bairros: processa apenas `(uf, cidade, bairro)` ainda ausente em `neighborhoods`.
