# Agendamento 2x/dia da ingestão

A lista da Caixa atualiza ~1x/dia (≈01h UTC), mas rodamos 2x para tolerar
falhas de download e atrasos de publicação.

## Janelas escolhidas

- **07:00 BRT** (10:00 UTC) — 1ª passada após o ciclo de atualização da Caixa
- **19:00 BRT** (22:00 UTC) — 2ª passada de segurança

## Opção A — cron no VPS

```cron
0 10 * * * /home/ubuntu/imoveis-caixa/scripts/ingest.sh
0 22 * * * /home/ubuntu/imoveis-caixa/scripts/ingest.sh
```

## Opção B — n8n (preferida; reaproveita stack já existente)

Workflow no n8n com 2 triggers Schedule (`0 10 * * *` e `0 22 * * *`)
chamando um node `Execute Command` ou `SSH` que rode:

```
cd /home/ubuntu/imoveis-caixa && ./scripts/ingest.sh
```

Vantagem: notificação automática de falha pra Evolution/Telegram pelo
mesmo workflow que vai disparar os alertas dos usuários (Fase 5).

## Opção C — systemd timer

Mais robusto que cron (logs estruturados via journalctl).
Criar `/etc/systemd/system/imoveis-ingest.service` + `.timer` com
`OnCalendar=*-*-* 10,22:00:00 UTC`. Implementar quando o VPS for provisionado.
