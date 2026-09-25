# Continuity

Lifecycle safety for stock-quoted markets on Solana.

Continuity detects when a tokenized stock is retiring or being replaced, stops
Continuity-managed automation from relying on the obsolete token, and prepares
a reviewed successor market that an authorized wallet can approve on Solana.

It does not control PreStocks instruments, freeze third-party pools, or move
funds without a wallet signature.

**Start here:** [`docs/product-flow.md`](docs/product-flow.md) explains the
complete product in plain language: who uses it, where each token comes from,
why only `SPCXx` is currently launch-ready, what the launch creates, what users
do after launch, and which boundaries remain. For final verification, use
[`docs/submission-test-runbook.md`](docs/submission-test-runbook.md). Confirmed
mainnet proof is indexed in
[`docs/mainnet-transaction-evidence.md`](docs/mainnet-transaction-evidence.md).

### Beginner glossary

- **Mint** — the unique Solana address that identifies one exact type of token.
  Two tokens can have similar names but different mint addresses.
- **Quote token** — the token a buyer pays with. In `CONT/SPCXx`, the buyer pays
  with `SPCXx` to receive `CONT`.
- **Meteora DBC** — Meteora's automated launch market. It creates the new token,
  starts its market, and changes its price according to preset rules as people
  buy and sell.
- **Pool** — the onchain market account that holds the trading rules and token
  balances.
- **DBC badge** — an onchain permission mark Meteora requires before some
  Token-2022 tokens can be used as payment tokens in DBC. It is not a logo or a
  badge Continuity can draw on the website.
- **Transfer fee** — a fee a token automatically removes whenever it moves
  between wallets. The current DBC launch route cannot safely use the seven
  affected PreStocks mints as quote tokens.
- **Graduation** — the point where a successful launch leaves the opening
  bonding curve and its liquidity moves into a regular Meteora DAMM v2 pool.

## Understand the product in five objects

### 1. Stock instrument

A stock instrument is one exact token mint representing an asset. `SPACEX` and
`SPCXx` are different Solana tokens even though both relate to SpaceX.

PreStocks announced that `SPACEX` will expire and identified `SPCXx` as its
successor. Continuity preserves that source evidence and binds the two exact
mint addresses into a machine-readable lifecycle manifest.

Source: [PreStocks SpaceX lifecycle notice](https://prestocks.com/spacex)

### 2. Base token

The base token is the token being launched. In the reference implementation it
is `CONT`, the token associated with the Continuity Sentinel agent and its
protection service.

`CONT` now exists on Solana at
[`Hae9…epua`](https://solscan.io/token/Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua).
Its name and ticker are Continuity product choices. The confirmed reference
transaction created its mint together with the initial Meteora market.
PreStocks, ClawPump, Meteora, and Pyth do not issue `CONT`.

### 3. Stock-quoted market

A market such as `CONT/SPCXx` lets buyers exchange the stock token `SPCXx` for
the base token `CONT`, and vice versa. Meteora's onchain programs operate the
automated pricing and liquidity rules instead of a traditional order-book
operator manually matching every buyer and seller.

Continuity reviews and prepares the market. A wallet-approved transaction calls
Meteora DBC on Solana to create it. After confirmation, the market exists on
Meteora; it is not merely a page inside Continuity.

### 4. Market operator

The market operator is the person or organization whose wallet owns the launch
decision, pays the Solana transaction costs, and signs the final transaction.
Like a permissionless launchpad, any visitor may become an operator: they
connect a Solana wallet and sign a one-time, non-transaction login message.
Continuity then creates a server session and stores that wallet as the owner of
its ClawPump-agent mappings, launch drafts, and preflight records in Supabase.

That authentication does not grant custody and does not sign a launch. It only
proves who may manage an offchain draft. The eventual Meteora transaction still
requires a separate, explicit wallet signature. Public visitors can inspect the
registry, evidence, and replay without connecting.

The `CONT/SPCXx` reference launch remains a locked first-party template. The
human wallet in `CONT_OPERATOR_WALLET` is its only permitted operator. This is
the project owner's normal Solana wallet—not the Continuity Sentinel agent
wallet. The custom path lets any authenticated operator create or select a ClawPump agent,
define a different new token, and use a separately verified stock quote. An
operator never receives authority over `CONT`, another wallet's agent, or
another wallet's draft.

### 5. Sentinel

Sentinel is Continuity's deterministic safety service. It evaluates exact token
identities, issuer evidence, market configuration, price references, wallet
prerequisites, and Solana simulation results before an operator can proceed. It
then keeps checking the same stock quote, DBC configuration, curve, reserves,
fees, and migration state after the market launches. Pre-launch verification
and post-launch protection are one continuous product loop.

ClawPump hosts the Continuity Sentinel agent and its paid scan surface. The
language model may coordinate the workflow, but it cannot invent a successor
mint, conversion ratio, deadline, or safety verdict.

## The complete SpaceX example

1. `SPACEX` is an existing PreStocks token.
2. PreStocks announces that `SPACEX` will expire and identifies `SPCXx` as its
   successor.
3. Continuity captures the source, verifies the exact mints, and creates a
   lifecycle manifest.
4. Users, applications, and ClawPump agents can see that `SPACEX` is retiring.
5. If a registered market depends on `SPACEX`, Sentinel returns
   `ROLLOVER_REQUIRED` and stops Continuity-managed actions through that market.
6. Continuity prepares a new market configuration using the verified successor
   `SPCXx` rather than silently changing the old pool.
7. The operator reviews the assets, DBC policy, accounts, and simulation.
8. Continuity rebuilds the transaction with a fresh blockhash and simulates it
   again.
9. Only the operator's wallet can approve and submit the transaction.
10. Once confirmed, Continuity records the resulting Meteora configuration and
   pool addresses and begins post-launch monitoring.

### What happens after a launch?

A confirmed launch is not the end of the product flow:

1. **Meteora DBC** holds the live bonding-curve market on Solana. Buyers can
   exchange the verified stock quote for the new agent token while the curve is
   active.
2. **Jupiter** can route users into that liquidity. Continuity's **Protected
   markets** table opens the exact buy/sell pair in Jupiter and links to the
   pool and launch transaction on Solscan.
3. **Continuity Sentinel** keeps checking the stock quote, curve, fee settings,
   reserves, and graduation state.
4. When the curve reaches its reviewed target, Meteora migrates liquidity to
   the configured DAMM v2 pool.
5. If the stock quote later retires or becomes unsafe, Continuity removes its
   Trade action, stops Continuity-managed automation, alerts the operator, and
   preserves the evidence needed to prepare a successor market. It does not
   freeze or rewrite the old pool.

Trading and custody remain with the user's wallet and Solana protocols;
Continuity is the safety, launch-review, and monitoring layer around the market.

The current `CONT/SPACEX` screen is a clearly labelled demo replay of steps 4–6;
there is no live `CONT/SPACEX` pool. The real reference market is
`CONT/SPCXx`: it was confirmed on Solana mainnet on 25 September 2026 and is
registered for Sentinel monitoring. The replay explains the rollover problem;
the live market proves the protected successor path.

## Why launch `CONT/SPCXx` at all?

Continuity is not primarily a token launchpad. `CONT/SPCXx` is the first-party
market for the Continuity Sentinel agent and proves the full product loop:

```text
issuer lifecycle evidence
          ↓
exact-mint safety verdict
          ↓
stock-aware Meteora DBC configuration
          ↓
unsigned transaction and Solana preflight
          ↓
explicit operator approval
          ↓
registered market and continuous monitoring
```

Launching an arbitrary token against an arbitrary stock would not prove the
safety claim. Pairing the reference token with `SPCXx` demonstrates that the
launch configuration is derived from a verified successor instrument and that
the same lifecycle policy can later protect the resulting market.

## Is Continuity "Pump.fun with stocks"?

Not by itself. ClawPump already supports launching an owned agent's token against
an approved custom Pump.fun quote asset. Its live pair catalogue includes many
tokenized stocks. Rebuilding only that form would duplicate an existing
ClawPump capability and would not explain what happens when a quote token is
retired or replaced. See the
[ClawPump Partner API](https://www.clawpump.tech/developers).

Continuity's stronger workflow is **Create protected agent market**:

1. authenticate an owned ClawPump agent;
2. define the token representing that agent or its service;
3. choose a lifecycle-verified stock quote asset;
4. apply a stock-aware Meteora DBC policy;
5. simulate and approve the launch; and
6. keep Sentinel attached to the resulting market.

This makes ClawPump's agent identity, wallet, skills, automations, and revenue
surface part of the product while Meteora supplies the distinctive launch and
liquidity mechanics.

The direct ClawPump custom-pair route remains useful as a compatibility path for
assets in ClawPump's approved Pump.fun catalogue. At the time of verification,
that catalogue contained a different SpaceX asset named `SPCX`, but not the
exact PreStocks successor mint `SPCXx` used by this reference implementation.
Continuity therefore builds the `SPCXx` flagship through Meteora's official DBC
SDK instead of pretending that ClawPump currently exposes that exact pair.

The live PreStocks catalog currently contains eight instruments. Continuity
monitors all eight, but catalog presence does not automatically mean launch
eligibility. `SPCXx` is the only fully reviewed quote asset in the current
reference-launch adapter. The eight current PreStocks mints are not silently
enabled: each must independently pass exact-mint, Token-2022 transfer-policy,
Meteora token-badge, executable-route, and market-reference checks. A monitored
instrument can therefore be visible while remaining unavailable for launch.

## What is configurable?

Meteora DBC controls the bonding curve used for initial price discovery, its
fee schedule, the quote amount required for graduation, the liquidity split,
and migration into the eventual DAMM pool. See the
[official DBC overview](https://docs.meteora.ag/overview/products/dbc/what-is-dbc).

The current `CONT/SPCXx` configuration is deliberately fixed and hashable:

- new `CONT` mint with a fixed one-billion-token supply and six decimals;
- existing `SPCXx` mint as the quote asset;
- dynamic opening fee that settles from 100 to 25 basis points over 15 minutes;
- a graduation threshold recalibrated to approximately `$1,000` of `SPCXx`;
- migration to Meteora DAMM v2;
- permanently locked migrated liquidity split between creator and partner.

The protected-agent-market wizard now exposes the owned ClawPump agent and
base-token metadata. Market design remains deliberately bounded to the reviewed
equity profile while the first launch is proven; broader supply, fee,
graduation, and allocation choices can be added as versioned safe presets.
Safety invariants are not optional: the exact quote mint, source-backed
successor, retired-asset rejection, fresh reference checks, simulation, and
human wallet approval cannot be switched off.

## Product paths

### Public user

```text
Open Markets
  → inspect the eight current instruments
  → open an instrument
  → read its lifecycle status and evidence
  → no wallet required
```

### Confirmed reference market

```text
Open Markets
  → review the live PreStocks catalog under Stock coverage
  → find CONT / SPCXx under Protected markets
  → inspect its Sentinel status, curve progress, latest check, and Solscan launch
  → open SpaceX to trace SPCXx back to the SPACEX lifecycle evidence
```

The locked `CONT/SPCXx` workflow has already completed. It is retained as the
project's reproducible mainnet proof, not as a second launch mode in the product.
The Launch page now focuses on creating the next protected market.

### Custom protected-market operator

```text
Open Launch
  → connect a Solana wallet
  → sign the one-time Continuity login message
  → create or select a ClawPump agent mapped to that wallet
  → define the new agent token
  → select a launch-enabled stock quote asset
  → save the operator-owned draft in Supabase
  → review the bounded stock-aware Meteora design
  → build and store the exact preflight result
  → continue only after simulation passes
  → approve and submit in the same verified operator wallet
  → register the confirmed market and begin monitoring
```

### ClawPump or external agent

```text
Call the Sentinel skill, API, or MCP
  → request an instrument or quote-rail scan
  → receive a deterministic verdict and proof
  → never receive unrestricted wallet authority
```

### Active-market monitoring

```text
Read a registered Meteora market
  → reconcile quote mint and reviewed configuration
  → monitor DBC progress, migration, fees, reserves, and lifecycle evidence
  → stop only Continuity-managed actions when policy fails
  → alert the operator and prepare a new reviewed market
```

## What the current build can do

- Public, automatically scanned registry of all eight current PreStocks instruments
- Per-instrument lifecycle detail and source-evidence views
- Verified `SPACEX → SPCXx` lifecycle manifest
- Deterministic `LAUNCH_SAFE`, `MANUAL_REVIEW`, `LAUNCH_BLOCKED`, and
  `ROLLOVER_REQUIRED` verdicts
- Wallet-free `/demo` replay and live-read `/app` workspace
- Composite stock reference from direct Jupiter routes cross-checked with Pyth
- Stock-aware `$1,000` Meteora graduation calibration
- Canonically hashed Meteora DBC configuration built with the official SDK
- Authenticated ClawPump agent binding for fee and leftover-receiver roles
- Exact unsigned creation transaction, account diff, wallet prerequisites, and
  Solana simulation boundary
- Solana wallet challenge authentication with replay-resistant, hashed sessions
- Supabase ownership for operators, mapped ClawPump agents, protected-market
  drafts, and stored preflight results
- A focused five-step protected-market launch workflow with locked safety gates
- Idempotent final transaction preparation, wallet sign-and-send, Solana
  confirmation, exact-account verification, and confirmed-market registration
- Scheduled registered-market monitoring for quote identity, lifecycle state,
  DBC curve progress, graduation, fee configuration, and reserves
- Public Markets view for confirmed protected markets, latest Sentinel status,
  curve progress, last check, and launch transaction
- Durable Supabase lifecycle manifests, Sentinel runs, decision receipts,
  monitoring snapshots, and operator alerts
- ClawPump Sentinel skill, x402-shaped scan endpoint, and read-only MCP tools
- Hash-chained Sentinel and monitoring evidence
- Confirmed `CONT/SPCXx` mainnet market with a persisted `POOL_LIVE` post-launch scan

## Confirmed mainnet proof

The reference launch is complete:

- market: `CONT / SPCXx`;
- transaction: [`3Sbk…zch4`](https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4);
- CONT mint: [`Hae9…epua`](https://solscan.io/token/Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua);
- SPCXx quote mint: `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8`;
- Meteora DBC configuration: `GVmofTcACEyQEdPGTLqiXeZNYBiCEX8wcr7mAkgHSYc`;
- Meteora virtual pool: `HSokfXowJKiSvDoQtR3oVTuvBJ7kneUqZVE9pypZCnib`;
- finality: finalized at slot `450328456`;
- Supabase state: launch attempt `CONFIRMED`, protected market `ACTIVE`.
- first monitoring receipt: `6de402b9…ef218` with lifecycle `CURRENT` and DBC state `POOL_LIVE`.

Independent finalized RPC reads confirm that the mint exists under the SPL Token
program and that the configuration and virtual pool exist under Meteora DBC.
The complete human-readable record is in
[`docs/mainnet-transaction-evidence.md`](docs/mainnet-transaction-evidence.md).
The shortest production validation sequence is in
[`docs/submission-test-runbook.md`](docs/submission-test-runbook.md).

## What is not finished

- The MCP HTTP contract is regression-tested locally; a deployed external MCP
  client session and a paid ClawPump x402 call still need captured proof.
- The ClawPump-hosted skill still needs to be installed/activated and exercised
  through one real scheduled run and one paid x402 request.
- Only exact `SPCXx` is launch-enabled today. Other catalog instruments remain
  blocked until they independently satisfy the same non-optional checks.

## Persistence and ownership

Solana remains the source of truth for token mints, signatures, Meteora
configuration accounts, and pool accounts. Supabase indexes the offchain
ownership and launch workflow around that state:

- authenticated operators and their owned ClawPump agents;
- protected-market drafts and their configuration hashes;
- preflight attempts and simulation results;
- idempotent launch attempts and transaction signatures;
- confirmed base mint, DBC configuration, virtual-pool, and later migration-pool
  addresses;
- lifecycle manifests, Sentinel runs, decision receipts, monitoring snapshots,
  and operator alerts.

The migration-pool address is intentionally `null` at initial DBC launch. That
pool does not exist until the curve graduates and Meteora performs migration;
Sentinel records it when it becomes real rather than inventing it at launch.

The database must never store wallet private keys. Operators authenticate with
a wallet-signature challenge and sign transactions in their wallet.

The browser never receives the Supabase server secret. All database access
runs through server routes, public roles have no table privileges, row-level
security is enabled, session tokens are stored only as hashes, and the database
never stores wallet private keys.

## Sponsor roles

- **PreStocks** supplies the stock instruments and lifecycle evidence.
- **ClawPump** hosts the Sentinel AI agent, its optional agent automations, the
  installable skill, and paid scan distribution. Continuity's core daily market
  monitor runs independently through the Vercel scheduler.
- **Meteora** supplies the DBC and DAMM programs that create and operate the
  stock-quoted market.
- **Jupiter** supplies executable routes used to estimate the stock token's
  market value and may route swaps after launch.
- **Pyth** independently cross-checks the reference market used by policy.
- **Solana** supplies token accounts, wallet approval, transaction simulation,
  execution, and the permanent onchain market state.

## Product roles and authority

| Role | Can do | Cannot do |
| --- | --- | --- |
| Public visitor | Browse instruments, lifecycle evidence, deadlines, and replayed decisions without a wallet | Create drafts, approve launches, or control agents |
| Human operator | Verify wallet ownership, map an owned ClawPump agent, create a draft, run preflight, and explicitly approve a launch | Manage another operator's drafts or bypass safety gates |
| Continuity reference operator | Use the wallet configured in `CONT_OPERATOR_WALLET` to approve the locked `CONT/SPCXx` reference launch | Substitute a different token, quote mint, agent, or policy inside the locked template |
| ClawPump Sentinel agent | Run scheduled/on-demand checks, expose the skill and paid scan, receive configured partner roles, and stop its own managed actions on a failure | Sign as the human operator, take custody of the operator wallet, or freeze third-party pools |
| External agent or application | Query the API/MCP for instruments, evidence, verdicts, and proofs | Receive unrestricted signing authority |
| Meteora programs | Create and operate the reviewed DBC market and later DAMM migration | Decide whether issuer lifecycle evidence is trustworthy |

The two wallets are deliberately different. `CLAWPUMP_AGENT_ID` resolves the
Sentinel agent wallet used for partner economics and automation. The connected
human wallet owns the draft, pays account-creation/network costs, and supplies
the only final approval signature.

## Source architecture

All authored application code is TypeScript or TSX.

```text
src/
  app/                    # Next.js routes and API surfaces
  components/             # Shared visual modules
  domain/continuity/      # Pure lifecycle, policy, hash, and receipt rules
  features/dashboard/     # Product workspaces and launch review UI
  features/home/          # Homepage and sponsor/product explanation
  features/wallet/        # Solana wallet and RPC access
  integrations/           # PreStocks, ClawPump, Meteora, Jupiter, and Pyth
  persistence/            # Supabase ownership, launch, and monitoring records
  services/               # Deterministic orchestration
  transactions/           # Meteora transaction construction and preflight
skills/
  continuity-sentinel/    # ClawPump skill package
supabase/
  migrations/             # Operator ownership and launch-state schema
```

Route files compose features; domain modules contain no React or Next.js
dependencies. `eslint.config.mjs` is ESLint configuration, not application
source. TypeScript compilation is strict and `allowJs` is disabled.

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Configure Supabase

1. Create a Supabase project.
2. Open **Project Settings → API Keys** and copy the project URL and a
   server-only secret key into `.env.local`:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_KEY
   ```

3. Apply all migrations in order:
   - [`202609250001_operator_launch_platform.sql`](supabase/migrations/202609250001_operator_launch_platform.sql)
   - [`202609250002_launch_execution_and_monitoring.sql`](supabase/migrations/202609250002_launch_execution_and_monitoring.sql)
   - [`202609250003_reference_operator_handoff.sql`](supabase/migrations/202609250003_reference_operator_handoff.sql)

   Alternatively, after linking the Supabase CLI to the project, run
   `supabase db push` from the repository root.
4. Restart the app and open `/api/health`. `integrations.supabase.status` should
   be `ready_for_launch_and_monitoring`.

For an older project, `SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy
fallback. New projects should use `SUPABASE_SECRET_KEY`. Do not prefix either
variable with `NEXT_PUBLIC_`, commit the secret key,
or paste it into client code. Add the same two server-side variables to Vercel
before testing the deployed custom launch flow.

Open:

- `http://localhost:3000` — product site
- `http://localhost:3000/demo` — wallet-free lifecycle replay
- `http://localhost:3000/app` — live-read product workspace
- `http://localhost:3000/app/markets/spacex` — SpaceX lifecycle detail
- `http://localhost:3000/app/launch` — create a new protected market

## Agent access

- ClawPump skill: `skills/continuity-sentinel/SKILL.md`
- Scan endpoint: `POST /api/v1/scans/quote-rail`
- Sentinel runs: `GET/POST /api/v1/sentinel/runs`
- Scheduled lifecycle and protected-market monitor: `GET /api/v1/sentinel/schedule`
- MCP endpoint: `POST /api/mcp`

The MCP server exposes `list_market_lifecycle`, `get_market_evidence`, and
`run_quote_rail_scan`. Payment never grants transaction or signing authority.

## Production environment variables

The essential Vercel secrets are:

- `CLAWPUMP_API_KEY` — lets the server create and verify ClawPump agents;
- `PYTH_PRO_API_KEY` — supplies the independent price cross-check;
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` — store operators, launches,
  monitoring checks, and history;
- `CRON_SECRET` — protects the automatic daily monitor endpoint.

The first-party reference settings are:

- `CLAWPUMP_AGENT_ID` — Continuity Sentinel's ClawPump agent ID;
- `CONT_OPERATOR_WALLET` — the human wallet that approved the completed CONT
  reference launch;
- `CONT_TOKEN_METADATA_URI` — the published CONT metadata URL;
- `METEORA_DBC_CONFIG_ADDRESS` and `METEORA_DBC_POOL_ADDRESS` — the confirmed
  CONT/SPCXx accounts that the reference Sentinel scan inspects.

Set `SOLANA_RPC_URL` to a reliable mainnet RPC for server reads and
`NEXT_PUBLIC_SOLANA_RPC_URL` to a browser-safe mainnet RPC for wallet actions.
`JUPITER_API_KEY` remains optional. The exact copyable checklist and public
mainnet addresses are in
[`docs/submission-test-runbook.md`](docs/submission-test-runbook.md).

## Mainnet launch prerequisites

Before intentionally launching another protected market:

1. Set `CONT_OPERATOR_WALLET` to the human Solana wallet that will sign.
2. Apply all Supabase migrations.
3. Fund that human wallet for Solana account creation and transaction fees.
4. Fund the configured Continuity Sentinel agent wallet enough for its required
   onchain account to exist.
5. Set `CRON_SECRET` in Vercel so the scheduled registered-market monitor can
   authenticate.
6. Open `/app/launch`, verify the operator wallet, run preflight, inspect every
   account change, and approve only if the wallet request matches the review.

Every deliberate ClawPump-agent funding transfer, submitted launch attempt,
confirmed Meteora address, and first post-launch Sentinel result must be added to
[`docs/mainnet-transaction-evidence.md`](docs/mainnet-transaction-evidence.md).
Supabase remains the machine-readable source of launch and monitoring records;
the document is the public evidence index. Never place secrets or signed
transaction payloads in the repository.

No mainnet transaction is sent merely because these variables are configured.
Execution is disabled by default in the sense that public reads, scans, drafts,
and simulations never sign. Only the final explicit wallet approval sends the
reviewed transaction.

### Current stock-quote support

Continuity monitors the complete eight-asset PreStocks catalog, but monitoring
does not imply that every mint can be used as a Meteora DBC quote token. The
launch wizard currently enables `SPCXx`, the verified SpaceX successor. Live
audits of the seven current PreStocks issuer mints confirm their catalog
identity and Jupiter routes, but the mints currently lack the required Meteora
DBC quote badge and expose transfer-fee behavior that the current launch path
cannot safely approve. Continuity shows those assets in the selector and on
their detail pages, but fails closed until the onchain requirements pass.

In simpler terms: imagine Meteora DBC is a vending machine and the stock token
is the payment card. `SPCXx` currently has the permission mark and payment
behavior the machine understands. The other seven cards are real, but the
machine does not yet support their fee rules and has not approved them for this
use. Continuity therefore watches those assets but does not let a user start a
launch that Meteora would reject.

This is a Meteora compatibility boundary, not a UI whitelist. When a mint gains
compatible DBC support, Continuity must add its price-reference adapter and the
mint must pass the same live identity, lifecycle, badge, transfer-policy,
route, and price-reference audit before launch approval is enabled.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm sentinel:run
```

With Supabase configured, live Sentinel API/MCP runs write durable hash-chained
records and decision receipts there. The CLI still uses the same store boundary;
without Supabase it falls back to `.continuity-data/`, which is ignored by Git.
Internal research and submission notes live in `private-notes/` and are also
excluded from Git.
