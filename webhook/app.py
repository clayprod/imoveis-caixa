"""Webhook que dispara comandos do CLI dentro do container `imoveis-ingest`.

Auth via header `Authorization: Bearer <WEBHOOK_TOKEN>`.
Endpoints:
  - GET  /health
  - POST /trigger-ingest
  - POST /trigger-scrape       (?limit=1000&concurrency=15&scope=pending)
  - POST /trigger-matriculas   (?limit=500&concurrency=5)
  - POST /trigger-geocode      (?limit=50)
  - POST /trigger-ocr          (?limit=10)
  - POST /trigger-embed        (?limit=500&batch=50)
  - POST /trigger-neighborhoods (?limit=20)
"""
import os
import time
from typing import Optional

import docker
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

TOKEN = os.environ["WEBHOOK_TOKEN"]
INGEST_IMAGE = os.environ.get(
    "INGEST_IMAGE",
    "ghcr.io/clayprod/imoveis-caixa-ingest:latest",
)
client = docker.DockerClient(base_url="unix:///var/run/docker.sock")
app = FastAPI(title="imoveis-webhook")


class RunResult(BaseModel):
    command: str
    exit_code: int
    duration_seconds: float
    output_tail: str


def _check_auth(authorization: Optional[str]) -> None:
    if not authorization or authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=403, detail="forbidden")


def _run(cli_args: list[str], mount_data: bool = False) -> RunResult:
    started = time.monotonic()
    postgres_host = os.environ.get("POSTGRES_HOST", "postgres")
    postgres_port = os.environ.get("POSTGRES_PORT", "5432")
    db_url = (
        f"postgresql://{os.environ['POSTGRES_USER']}:"
        f"{os.environ['POSTGRES_PASSWORD']}@{postgres_host}:{postgres_port}/"
        f"{os.environ['POSTGRES_DB']}"
    )
    volumes = {}
    if mount_data:
        volumes["/opt/imoveis-caixa/data"] = {"bind": "/data", "mode": "rw"}

    container = client.containers.run(
        INGEST_IMAGE,
        cli_args,
        network="imoveis-net",
        environment={
            "DATABASE_URL": db_url,
            "CAIXA_PROXY_URL": os.environ.get("CAIXA_PROXY_URL", ""),
            "CAIXA_PROXY_TOKEN": os.environ.get("CAIXA_PROXY_TOKEN", ""),
            "GROQ_API_KEY": os.environ.get("GROQ_API_KEY", ""),
            "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
            "GROQ_MODEL": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "OPENAI_EMBED_MODEL": os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
            "OCR_INITIAL_SAMPLE_SIZE": os.environ.get("OCR_INITIAL_SAMPLE_SIZE", "50"),
            "OCR_MAX_INPUT_CHARS": os.environ.get("OCR_MAX_INPUT_CHARS", "20000"),
            "NOMINATIM_URL": os.environ.get("NOMINATIM_URL", "https://nominatim.openstreetmap.org"),
            "CRAWLER_USER_AGENT": os.environ.get("CRAWLER_USER_AGENT", ""),
        },
        volumes=volumes,
        remove=False,
        detach=True,
    )
    try:
        result = container.wait(timeout=1800)
        logs = container.logs().decode("utf-8", errors="replace")
        exit_code = int(result.get("StatusCode", -1))
    finally:
        try:
            container.remove(force=True)
        except Exception:
            pass

    return RunResult(
        command=" ".join(cli_args),
        exit_code=exit_code,
        duration_seconds=round(time.monotonic() - started, 2),
        output_tail=logs[-4000:],
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/trigger-ingest", response_model=RunResult)
def trigger_ingest(authorization: Optional[str] = Header(None)) -> RunResult:
    _check_auth(authorization)
    return _run(["ingest", "--scope", "geral"])


@app.post("/trigger-scrape", response_model=RunResult)
def trigger_scrape(
    limit: int = 1000,
    concurrency: int = 15,
    scope: str = "pending",
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(
        ["scrape", "--scope", scope, "--limit", str(limit), "--concurrency", str(concurrency)]
    )


@app.post("/trigger-matriculas", response_model=RunResult)
def trigger_matriculas(
    limit: int = 500,
    concurrency: int = 5,
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(
        ["download-matriculas", "--limit", str(limit), "--concurrency", str(concurrency)],
        mount_data=True,
    )


@app.post("/trigger-geocode", response_model=RunResult)
def trigger_geocode(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(["geocode", "--limit", str(limit)])


@app.post("/trigger-ocr", response_model=RunResult)
def trigger_ocr(
    limit: int = 10,
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(["ocr", "--limit", str(limit)], mount_data=True)


@app.post("/trigger-embed", response_model=RunResult)
def trigger_embed(
    limit: int = 500,
    batch: int = 50,
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(["embed", "--limit", str(limit), "--batch", str(batch)])


@app.post("/trigger-neighborhoods", response_model=RunResult)
def trigger_neighborhoods(
    limit: int = 20,
    authorization: Optional[str] = Header(None),
) -> RunResult:
    _check_auth(authorization)
    return _run(["neighborhoods", "--limit", str(limit)])
