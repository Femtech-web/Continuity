# Continuity agent instructions

Read `README.md` and `docs/product-flow.md` before changing product behavior,
architecture, integrations, economic design, or the demo. Use
`docs/submission-test-runbook.md` for release verification and
`docs/mainnet-transaction-evidence.md` for confirmed public-chain claims.

- Keep product language traceable to an issuer source, live RPC read, database
  record, or confirmed transaction.
- Never describe simulated, pending, claimable, or unclaimed value as settled
  wallet funds.
- Keep operator authority, ClawPump agent authority, and public read access
  separate.
- Preserve fail-closed lifecycle, quote-mint, configuration, simulation, and
  wallet-approval gates.
- Keep user- and judge-facing documentation under `docs/`; do not commit local
  working notes, secrets, generated evidence, or private keys.

Financial actions default to preview or simulation. A transaction becomes executable only after deterministic policy checks and the configured approval mode pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
