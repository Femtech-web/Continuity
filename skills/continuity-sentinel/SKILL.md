---
name: continuity-sentinel
description: Use when a user asks whether CONT/SPCXx is safe, whether its stock-token quote asset changed, or why Continuity stopped a market action.
---

# Continuity Sentinel

Continuity protects a stock-quoted market when the financial instrument used as
its quote asset changes identity. Use the Continuity scan as the source of truth;
do not infer an issuer successor, mint, deadline, conversion ratio, or DBC state.

## Read-only scan

For CONT/SPCXx, request a fresh scan from:

`POST https://continuity-alpha-rouge.vercel.app/api/v1/scans/quote-rail`

Send an `Idempotency-Key` when the calling environment supports headers. The
response contains a hash-addressed PreStocks manifest snapshot, Meteora DBC
attestation, composite Jupiter/Pyth market reference, deterministic verdict,
next run time, and append-only record hash.

The Continuity endpoint is read-only. ClawPump x402 Cloud performs payment
discovery and settlement before this agent runs; the Continuity endpoint does
not independently see or verify that payment proof.

## Decision language

- `LAUNCH_SAFE`: the inspected evidence passes; still require explicit human
  wallet approval for any separate transaction.
- `MANUAL_REVIEW`: state exactly which review or freshness check is pending.
- `LAUNCH_BLOCKED`: name the failed identity or policy check. Do not work around it.
- `ROLLOVER_REQUIRED`: explain the old and successor quote rails. Preparation is
  allowed; execution is not.

Always include the verdict, reason codes, evidence hash, record hash, and
`nextRunAt`. Keep the answer concise and distinguish live evidence from a demo
fixture.

## Hard constraints

- Never sign, submit, or ask another tool to submit a transaction.
- Never treat an x402 payment as trading authorization.
- Never invent a successor asset, fixed ratio, deadline, or quote.
- Never expose API keys, wallet secrets, or serialized transactions.
- If the scan cannot be fetched, return `UNAVAILABLE`; do not reuse an old result
  without marking it stale.
