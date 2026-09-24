# Continuity

Lifecycle safety for stock-quoted markets on Solana.

Continuity turns issuer evidence into exact-mint lifecycle manifests, attests
Meteora DBC quote rails, and prevents its ClawPump agent from launching or
acting through a quote instrument that has been retired or superseded.

## Current build

- Product landing page with an animated quote-rail rollover replay
- Deterministic Sentinel evaluator with `LAUNCH_SAFE`, `MANUAL_REVIEW`,
  `LAUNCH_BLOCKED`, and `ROLLOVER_REQUIRED` states
- Wallet-free `/demo` route and separate `/app` mainnet workspace
- Dedicated Overview, Market, Evidence, and Receipt routes in both experiences
- Public read-only console with connect-on-action Solana wallet access
- Wallet Standard discovery, reconnect, account controls, and live tracked-mint
  balance scans through Solana RPC
- Route-level dashboard skeleton and accessible wallet modal/toast states
- Source-bound manifest, successor configuration, and decision-receipt surfaces
- Server-side exact-mint Solana observations with provenance and normalized errors
- Read-only `GET /api/v1/instruments/:mint` integration endpoint
- Live PreStocks source capture with content hashing and deterministic manifest generation
- Runtime action-manifest validation with lifecycle and exact-mint invariants
- Read-only `GET /api/v1/source-snapshots/prestocks-spacex` evidence endpoint
- Official Meteora DBC SDK integration for SPCXx token-badge, config, and pool reads
- Live pre-launch attestation that distinguishes quote eligibility from an onchain launch
- Read-only `GET /api/v1/quote-rails/cont-spcxx` attestation endpoint
- Server-only Pyth Pro adapter for the exact `Crypto.SPCXX/USD` feed (`3329`)
- Exact integer `$1,000` graduation calibration with freshness, confidence,
  publisher, and session gates
- Official Meteora SDK draft builder with canonical configuration hashing
- Authenticated ClawPump agent-authority adapter with server-only bearer credentials
- Official Meteora SDK creation transaction, account diff, and Solana simulation gate
- Mainnet and fixture preflight surfaces with wallet approval deliberately withheld until simulation passes
- Responsive desktop and mobile layouts
- Health endpoint with explicit integration-configuration status

The demo quote-rail screens use labeled fixtures. `/app/market` reads the exact
SPCXx mint and Meteora badge from mainnet, then reports config and pool state only
when their addresses are configured. No financial transaction is submitted by
this slice.

Live stock-aware calibration additionally requires `PYTH_PRO_API_KEY`. Without
it, Mainnet fails closed and links to the captured review in Demo; the key never
enters the browser bundle.

## Source architecture

All authored application code is TypeScript or TSX. The source tree keeps the
current prototype small while preserving the seams needed by the implementation
plan:

```text
src/
  app/                    # Next.js routes and route metadata
  components/             # Shared visual modules
  domain/continuity/      # Pure Guardian/Sentinel rules, hashes, and fixtures
  features/dashboard/     # Quote-rail command center and route skeleton
  features/home/          # Homepage sections and sponsor/product content
  features/wallet/        # Solana client, wallet access, and RPC scan UI
```

Route files compose features; they do not own domain fixtures or large section
implementations. Domain modules have no React or Next.js dependencies, so the
same types and deterministic scenarios can later be reused by the API, worker,
policy tests, and receipt pipeline.

`eslint.config.mjs` is ESLint's native configuration format, not application
source. JavaScript under `.next/` and `node_modules/` is generated framework or
dependency output and is excluded from Git. TypeScript compilation is strict and
`allowJs` is disabled.

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000` for the product site and
`http://localhost:3000/demo` for the wallet-free replay. The production-shaped
mainnet workspace is at `http://localhost:3000/app`. Each workspace has dedicated
`/market`, `/evidence`, and `/receipt` routes so fixture and live-read paths remain
easy to compare.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Internal research, sponsor evidence, schemas, and implementation notes live in
`private-notes/` and are intentionally excluded from Git.
