# Continuity

Protected agent markets that keep following their stock quote.

Continuity is a launch, protection, and treasury platform for AI-agent tokens
that trade against tokenized stocks on Solana. An operator connects a wallet,
selects a ClawPump agent they control, defines that agent's token, and chooses a
verified PreStocks stock token as the asset buyers will pay with. Continuity
checks the exact stock mint and issuer lifecycle, prepares a stock-aware Meteora
market, simulates the complete transaction, and asks the operator's wallet for
the only signature that can launch it.

The product does not stop at launch. Every confirmed market is registered under
**Protected markets**, where Continuity Sentinel continues checking the stock
token, Meteora configuration, bonding-curve progress, fees, reserves, and later
migration. If the stock token is retired or replaced, Continuity stops its own
managed automation from deepening the obsolete market, explains why, and helps
the operator prepare a separately reviewed successor market. It cannot rewrite
or freeze the old pool.

Each protected market also has an **Agent treasury**. Continuity verifies that
the bound ClawPump agent is the market's real onchain fee authority and shows
the partner fees Meteora has recorded for it, separately from trader liquidity
and the human operator's wallet. Reading those fees is live. Claiming, swapping,
and depositing them into a lending vault remain deliberately locked until the
exact agent wallet has a supported, reviewable signing route.

Public users can inspect stock lifecycles and protected markets without a
wallet. Operators use the five-step launch flow. ClawPump agents can run the
same safety policy through the Continuity skill or paid x402 service, while
Claude, Codex, and other applications can use the read-only MCP/API. None of
those agent interfaces receives unrestricted signing authority.

In one line:

```text
owned ClawPump agent + new agent token + verified stock quote
  → wallet-approved Meteora market
  → continuous Sentinel protection
  → verified agent-fee treasury
```

**Start here:** [`docs/product-flow.md`](docs/product-flow.md) explains the
complete product in plain language: who uses it, where each token comes from,
why only `SPCXx` is currently launch-ready, what the launch creates, what users
do after launch, and which boundaries remain. For final verification, use
[`docs/submission-test-runbook.md`](docs/submission-test-runbook.md). Confirmed
mainnet proof is indexed in
[`docs/mainnet-transaction-evidence.md`](docs/mainnet-transaction-evidence.md).
External MCP, ClawPump skill, and x402 verification is documented in
[`docs/external-agent-access.md`](docs/external-agent-access.md).

## Contents

1. [What Continuity is](#what-continuity-is)
2. [One protected market from start to finish](#one-protected-market-from-start-to-finish)
3. [What Meteora DBC means](#what-meteora-dbc-means)
4. [The complete SpaceX example](#the-complete-spacex-example)
5. [What happens after a launch](#what-happens-after-a-launch)
6. [Why launch CONT/SPCXx](#why-launch-contspcxx-at-all)
7. [How automatic monitoring works](#how-automatic-monitoring-works)
8. [Why only SPCXx can launch today](#why-only-spcxx-can-launch-today)
9. [Product paths](#product-paths)
10. [What is live today](#what-the-current-build-can-do)
11. [What is not live yet](#what-is-not-live-yet)
12. [Roadmap](#roadmap)
13. [Confirmed mainnet proof](#confirmed-mainnet-proof)
14. [Roles and authority](#product-roles-and-authority)
15. [Run, configure, and verify](#run-locally)
16. [Agent treasury](#agent-treasury)

## What Continuity is

Continuity serves one connected lifecycle rather than a collection of unrelated
tools:

| Product surface | What a person or agent accomplishes there |
| --- | --- |
| **Markets** | Browse the complete current PreStocks catalog, see which instruments are current or retiring, inspect exact source evidence, and open every market launched through Continuity. No wallet is required. |
| **Launch** | Pair an owned ClawPump agent and its new token with an eligible stock quote, review the bounded Meteora design, run a live Solana simulation, and explicitly approve the transaction in the operator wallet. |
| **Protected markets** | Open the live trade route, pool account, launch transaction, curve progress, and latest Sentinel result for each confirmed market. |
| **Activity** | Review automatic and on-demand lifecycle checks, deterministic verdicts, evidence hashes, receipts, and alerts. |
| **Treasury** | See the real Meteora partner fees assigned to each market's agent and verify that the agent—not Continuity or the operator—is the fee authority. |
| **Skill, x402, and MCP/API** | Let ClawPump agents and external applications request the same source-backed decision without receiving wallet custody or permission to launch. |

This makes Continuity different from a generic token launcher and from a stock
directory. The protected market is the product: verified before creation,
observable while it trades, monitored after launch, and connected to the
revenue of the agent responsible for it.

## One protected market from start to finish

### 1. Choose the agent and define its token

The operator connects a Solana wallet and either selects a ClawPump agent they
control or creates one through Continuity. They then define the new token for
that agent or service. In the reference market, the agent is **Continuity
Sentinel** and the token is `CONT`.

`CONT` now exists on Solana at
[`Hae9…epua`](https://solscan.io/token/Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua).
Its name and ticker are Continuity product choices; PreStocks, ClawPump,
Meteora, and Pyth did not issue it.

### 2. Choose the stock people will pay with

The operator chooses an eligible PreStocks token as the quote asset. In
`CONT/SPCXx`, a buyer pays with `SPCXx` to receive `CONT`. Continuity verifies
the exact mint rather than trusting a ticker, checks the issuer lifecycle,
transfer behavior, Meteora compatibility, executable route, and independent
market reference.

This matters because `SPACEX` and `SPCXx` are different Solana tokens even
though both represent SpaceX exposure. PreStocks announced that `SPACEX` will
expire and named `SPCXx` as its successor. Continuity preserves that source and
the two exact mint addresses in a machine-readable lifecycle manifest.

Source: [PreStocks SpaceX lifecycle notice](https://prestocks.com/spacex)

### 3. Review and create the market

Continuity turns the selected agent, new token, and verified stock quote into a
bounded Meteora DBC configuration. The operator reviews the pricing and fee
policy in product language. Continuity then builds the exact Solana
instructions, lists the accounts that will be created or changed, checks both
wallets, and simulates the transaction.

Only after every required check passes does the operator's wallet receive the
final approval request. A successful signature creates the new token and its
first stock-quoted market through Meteora's programs on Solana. The market is
not hosted inside Continuity; Continuity registers and protects the onchain
result.

### 4. Keep Sentinel attached after launch

Sentinel keeps checking the same stock mint, issuer lifecycle, DBC
configuration, curve progress, fees, reserves, and migration state. The market
appears under **Protected markets** with Trade, Pool, and Launch links. Activity
stores the matching evidence and decision history.

If the stock later retires, Sentinel stops Continuity-managed actions and
removes Continuity's Trade action. It does not seize user funds or modify the
old pool. Instead, it preserves the reason and prepares a separately reviewed
successor market for operator approval.

### 5. Track the agent's market revenue

Meteora can record part of the trading fees for the ClawPump agent configured
as the market partner. **Treasury** reads those fees directly from the pool,
checks that the registered agent is the real fee authority, and shows the SOL
the agent keeps for operating costs.

The treasury is currently read-only. Displayed claimable fees are real onchain
accounting, but they have not entered the agent wallet and are not yield.
Claiming and vault deposits remain locked until the exact ClawPump agent can
review and sign the required transaction through a supported public route.

### 6. Reuse the decision outside the website

The same lifecycle and market decision is available through the Continuity
ClawPump skill, a paid x402 service, and read-only MCP/API tools. This lets an
agent check a market before acting or sell a verified scan to another agent.
Payment buys the answer, never transaction authority.

### Terms used below

- A **mint** is the unique Solana address for one exact token.
- The **base token** is the new agent token being launched, such as `CONT`.
- The **quote token** is what buyers pay with, such as `SPCXx`.
- A **pool** is the onchain market account holding the pricing and liquidity
  rules.
- **Graduation** is when a successful opening curve migrates into a regular
  Meteora DAMM v2 liquidity pool.

## What Meteora DBC means

DBC means **Dynamic Bonding Curve**. In plain terms, it is the launch engine
that creates the new agent token and opens its first automatic market on
Solana.

At the beginning there is no traditional order book waiting for one buyer and
one seller to match. Meteora uses a reviewed pricing curve instead:

1. a buyer pays with the chosen stock quote token;
2. the curve calculates how much of the new agent token the buyer receives;
3. the price changes as buying and selling change the pool's reserves;
4. trading fees are recorded by Meteora; and
5. when the reviewed quote-token target is reached, liquidity graduates into a
   normal Meteora DAMM v2 pool.

Continuity does not invent that market math or hold the pool's money. It checks
the exact stock token, explains the settings, simulates the launch, requires a
human wallet signature, records the resulting addresses, and watches the
market afterwards. Meteora's
[official DBC overview](https://docs.meteora.ag/overview/products/dbc/what-is-dbc)
describes the underlying launch and graduation system.

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

## What happens after a launch?

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

## How automatic monitoring works

Monitoring is automatic after a protected market is registered:

1. Vercel calls Continuity's protected scheduler once per day on the current
   free deployment plan.
2. Continuity refreshes the issuer lifecycle record and loops through every
   registered protected market.
3. For each market it reads the expected quote mint and current Meteora pool
   state, then runs the same deterministic safety rules used before launch.
4. The result, evidence hash, market snapshot, and any alert are stored in
   Supabase.
5. **Markets** shows the latest protection state, while **Activity** keeps the
   append-only run history.

The **Check now** action and the protected API endpoint only request an extra
immediate run; they do not replace the schedule. No wallet is signed and no
funds move during a monitoring check.

ClawPump automations are an additional agent-facing path. They can ask for the
same Continuity verdict on their own schedule and explain it to an operator or
paid x402 customer. The core market monitor still runs even when nobody opens
the website and even when a ClawPump chat is idle.

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
- Confirmed `CONT/SPCXx` and operator-created `ORBIT/SPCXx` mainnet markets,
  each with a persisted `POOL_LIVE` post-launch scan
- Read-only agent treasury views that verify the live Meteora fee authority,
  show claimable partner fees, and keep those fees separate from pool liquidity

## What is not live yet

Continuity is deliberately explicit about the boundary between a working read,
a working transaction, and a planned action. The application does not present
planned treasury or rollover work as complete.

| Capability | Current truth | What is still required |
| --- | --- | --- |
| Protected-market launch | Live. Two separate mainnet launches created `CONT/SPCXx` and `ORBIT/SPCXx`. | Broader DBC presets can be added after they receive the same simulation and policy coverage. |
| Post-launch monitoring | Live. Registered markets are scanned on demand and by the production scheduler. | A paid scheduler or external keeper can increase cadence beyond the hosting plan's daily cron limit. |
| MCP access | Live and independently verified in MCP Inspector. | No launch authority is intentionally exposed through MCP. |
| ClawPump skill | Implemented, but the first dashboard test exposed a GET/POST mismatch. The route and skill are corrected in this build. | Redeploy, update the saved ClawPump skill, and capture one successful agent reply plus its matching Activity record. |
| Paid x402 scan | Endpoint and buyer instructions are implemented. | Complete one real paid request and retain the seller receipt or settlement signature. |
| Stock coverage | All eight current PreStocks instruments are monitored. | Only exact `SPCXx` is launch-enabled; every additional quote mint still needs compatible Meteora support and the same live checks. |
| Fee visibility | Live. Continuity can read real, claimable Meteora partner fees attributed to the bound agent. | The fee is not in the agent wallet until that exact agent signs a claim transaction. |
| Fee claim | Not live. There is intentionally no Claim button. | ClawPump must expose a supported bounded Meteora-claim action or reviewed transaction-signing route for the agent wallet. |
| Treasury yield | Not live. Nothing is automatically swapped or deposited. | Claiming, limits, reserve policy, one allowlisted vault, withdrawal testing, reconciliation, and receipts must all ship first. |
| DBC graduation | The live markets are still on their opening curves. | Meteora creates the DAMM v2 destination only when a curve reaches its configured threshold; Continuity will record the real address then. |
| Same-token rollover | Not live. Continuity cannot edit an old pool, and the current DBC creation path creates a new base token. | A separately reviewed AMM pool-creation route is required to preserve an existing base mint across a quote-token replacement. |

Claimable fees are real onchain accounting, but they are not the same as cash in
the ClawPump wallet and they are not yield. Their realizable value depends on a
successful claim and, if conversion is desired, a safe executable route.

## Roadmap

1. **Close the external-agent proof.** Redeploy the GET-compatible skill route,
   capture one successful ClawPump skill run, and complete one paid x402 call.
2. **Enable bounded agent fee claims.** Integrate a ClawPump-supported Meteora
   partner-fee claim action, show the decoded transaction, simulate it, require
   explicit approval, and store the returned signature and balance change.
3. **Add a guarded treasury policy.** Preserve an agent SOL reserve, cap every
   conversion and deposit, allow one reviewed SOL/USDC lending destination, and
   prove withdrawal before enabling any schedule. No borrowing or leverage.
4. **Increase monitoring cadence and resilience.** Add a production RPC with an
   SLA, more frequent scheduling, retry observability, and operator alerting.
5. **Expand launch-ready stock quotes.** Enable another PreStocks mint only after
   its exact mint, lifecycle, transfer behavior, Meteora compatibility, price
   reference, and executable route all pass.
6. **Support true successor pools for existing base tokens.** Add a reviewed AMM
   route that can create a new quote pool without pretending an old pool can be
   rewritten.

## Confirmed mainnet proof

Two end-to-end launches are complete. The reference market is:

- market: `CONT / SPCXx`;
- transaction: [`3Sbk…zch4`](https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4);
- CONT mint: [`Hae9…epua`](https://solscan.io/token/Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua);
- SPCXx quote mint: `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8`;
- Meteora DBC configuration: `GVmofTcACEyQEdPGTLqiXeZNYBiCEX8wcr7mAkgHSYc`;
- Meteora virtual pool: `HSokfXowJKiSvDoQtR3oVTuvBJ7kneUqZVE9pypZCnib`;
- finality: finalized at slot `450328456`;
- Supabase state: launch attempt `CONFIRMED`, protected market `ACTIVE`.
- first monitoring receipt: `6de402b9…ef218` with lifecycle `CURRENT` and DBC state `POOL_LIVE`.

The custom operator flow independently launched `ORBIT/SPCXx`:

- transaction: [`5a7M…BK28`](https://solscan.io/tx/5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28);
- ORBIT mint: [`CuRA…jkgG`](https://solscan.io/token/CuRACMHSYEFS32Cq9icPUkZdazBXvaKArtLoq8bwjkgG);
- Meteora DBC configuration: `AtDU5jy5eprpEaDpWtBZztkycvJRqaNGSBSExHq6Ya1b`;
- Meteora virtual pool: `EBAYsw8Y9HzVinacauNAx11um8QUNAsLCShNeNV8M7jn`;
- first monitoring receipt: `8b871cd2…74b08` with lifecycle `CURRENT` and DBC state `POOL_LIVE`.

Independent finalized RPC reads confirm that the mint exists under the SPL Token
program and that the configuration and virtual pool exist under Meteora DBC.
The complete human-readable record is in
[`docs/mainnet-transaction-evidence.md`](docs/mainnet-transaction-evidence.md).
The shortest production validation sequence is in
[`docs/submission-test-runbook.md`](docs/submission-test-runbook.md).

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
- `http://localhost:3000/app/treasury` — inspect agent fees and operating reserves

## Agent access

- ClawPump skill: `skills/continuity-sentinel/SKILL.md`
- Interactive ClawPump skill scan: `GET /api/v1/scans/quote-rail`
- Paid x402 scan origin: `POST /api/v1/scans/quote-rail`
- Sentinel runs: `GET/POST /api/v1/sentinel/runs`
- Scheduled lifecycle and protected-market monitor: `GET /api/v1/sentinel/schedule`
- Read-only agent treasuries: `GET /api/v1/treasuries`
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

## Why only `SPCXx` can launch today

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

### What is a transfer fee?

A normal token transfer moves the full amount from one account to another. A
token with a transfer fee automatically removes a small portion during that
move. For example, sending 100 units with a 1% transfer fee can deliver only 99
units to the destination.

That difference matters inside an automated market: the market must calculate
prices and reserves using the amount it actually receives, not the amount the
sender requested. The seven other live PreStocks mints use transfer-fee
behavior that the current Meteora DBC quote-token route does not safely accept,
and they do not currently have the required Meteora token badge. Continuity
therefore monitors them but refuses to advertise a launch that the reviewed
route cannot complete correctly.

## Agent treasury

Continuity now includes a read-only treasury for every protected market. It
reads the live Meteora partner-fee balance, verifies that the onchain fee
authority is the market's bound ClawPump agent, and shows that agent wallet's
SOL operating reserve. The figures refresh automatically and no signature is
requested.

This is deliberately not a vault for public deposits. It never counts or moves
trader liquidity, user tokens, or the human operator's wallet balance. If the
fee authority does not match the registered agent, or Sentinel has paused the
market, the treasury displays the problem instead of enabling an action.

The complete intended path is:

```text
Read live Meteora partner fees
  → verify the market's bound ClawPump agent is the fee authority
  → claim only that agent's earned fees
  → keep a fixed operating reserve
  → optionally convert a capped amount to a supported asset
  → supply it to one allowlisted Solana lending vault
  → record every movement and pause automatically on Sentinel risk
```

Only the first two steps are live today. Claiming and lending remain locked.
Meteora's current DBC SDK provides `claimPartnerTradingFee` and returns an
unsigned transaction whose fee payer and required authority must sign. ClawPump
does sign transactions through approved, purpose-built tools—such as swaps,
wallet transfers, lending, and x402 payments—but, as checked on 25 September
2026, its public Partner API and official 134-tool catalog do not document a
generic Solana transaction signer or a Meteora partner-fee claim tool.

That is a statement about the current supported public integration surface, not
a claim that ClawPump has no internal signing capability. Continuity will not
export the agent private key, call an undocumented internal route, or ask the
human operator to impersonate the agent.

### Integration request for the ClawPump team

Continuity needs either a bounded `meteora_claim_partner_fees` tool or a
reviewed arbitrary-transaction approval flow. The safe interface should:

- verify that the requesting user controls the agent;
- allowlist the Meteora program and exact claim instruction;
- show decoded instructions, accounts, fee amounts, and destination;
- simulate before signing and enforce maximum claim/spend values;
- require explicit confirmation and an idempotency key; and
- return the Solana signature and post-transaction balance evidence without
  exporting the private key.

Once that supported route exists, Continuity can add an honest Claim button and
then proceed to one capped SOL/USDC lending destination—no borrowing, leverage,
or automatic destination changes.

Primary references: [Meteora's DBC method and signing reference](https://github.com/MeteoraAg/meteora-invent/blob/main/skills/meteora/references/dbc.md),
[ClawPump's official tool catalog](https://github.com/Clawpump/claw-agent/blob/main/skills/clawpump/SKILL.md),
[ClawPump Partner API](https://clawpump.tech/developers), and
[Jupiter Lend](https://jup.ag/lend/earn).
The implementation phases and trust boundaries are specified in
[`docs/agent-treasury.md`](docs/agent-treasury.md).

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
Only user- and judge-facing product, verification, and evidence documents are
kept under `docs/`.
