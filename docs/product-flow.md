# Continuity product and end-to-end flow

This document answers the questions a new user, judge, market operator, or
agent integrator should ask before trusting the product.

## The product in one sentence

Continuity lets people create a new agent-token market priced in a verified
tokenized stock, then keeps checking that stock token and the resulting market
after launch.

It solves two connected problems:

1. **Before launch:** is this exact stock-token mint safe and compatible enough
   to use as a market's quote asset?
2. **After launch:** is that stock token still current, and is the market still
   operating with the reviewed configuration?

Continuity is not the stock issuer, wallet, exchange, or custodian. It is the
verification, launch-review, evidence, and monitoring layer around those
systems.

## The simplest possible explanation

Think of a protected market as a small automatic shop:

- the **new agent token** is the product on the shelf;
- the **stock token** is the money customers use to buy it;
- **Meteora DBC** is the automatic shop that creates the product and changes
  its price as customers buy and sell;
- **Jupiter** helps customers find and use that shop;
- **Continuity** checks that the money accepted by the shop is still the right,
  current token;
- the **human operator wallet** is the only key that can open the shop;
- **Sentinel** comes back automatically to check that the shop is still using
  the correct stock token and settings.

A **DBC badge** is an onchain permission mark required by Meteora for some
Token-2022 payment tokens. It is not a visual badge on Continuity. A **transfer
fee** means the token automatically keeps a small amount whenever it moves.
Meteora's current DBC route cannot safely use the seven affected PreStocks
mints with those fee rules, so Continuity refuses those launches instead of
letting the final transaction fail.

## The three assets and actors people commonly confuse

### The stock token

PreStocks issues tokenized-stock instruments. `SPACEX` and `SPCXx` are two
different Solana mints connected by a lifecycle event: PreStocks says `SPACEX`
is retiring and names `SPCXx` as its successor.

Continuity does not create either instrument. It captures the issuer evidence,
checks the exact mint addresses, and records the relationship.

### The new agent token

The operator defines a new token for an owned ClawPump agent. In the first live
market this token is Continuity / `CONT`, associated with the Continuity
Sentinel agent.

Meteora DBC creates the new base-token mint and its first bonding-curve market
in the wallet-approved launch transaction. `CONT` is not a PreStocks token and
is not the native token of the Continuity application.

### The two wallets

- The **human operator wallet** owns the Continuity draft, pays Solana costs,
  reviews the transaction, and alone approves the final launch.
- The **ClawPump agent wallet** identifies the selected agent and receives its
  configured partner/economic roles. It does not replace the human signer.

Any visitor with a supported Solana wallet may become an operator for their own
drafts. Connecting a wallet does not grant Continuity custody or permission to
sign transactions in the background.

## What a protected market is

`CONT/SPCXx` means:

- `CONT` is the new base token being launched;
- `SPCXx` is the existing stock token used to price and buy it;
- Meteora DBC supplies the live bonding curve and liquidity rules on Solana;
- the operator's wallet explicitly creates the token, configuration, and
  virtual pool;
- Continuity registers those addresses and attaches Sentinel monitoring.

The market is real Solana state, not an internal Continuity database entry.
Supabase stores its owner, review, addresses, transaction signature, and
monitoring history so the application can resume and explain the onchain state.

## End-to-end operator flow

### 1. Connect and prove wallet ownership

The operator connects a Solana wallet and signs a login message. This creates a
server session but sends no transaction.

### 2. Select or create a ClawPump agent

The operator selects an agent they control or creates one through the ClawPump
integration. Continuity binds that agent identity and wallet to the draft.

### 3. Define the new token

The operator enters the new agent token's name, symbol, and description.
Continuity later publishes the reviewed metadata used by the launch
transaction.

### 4. Select a stock quote

Continuity checks the exact issuer mint, lifecycle evidence, transfer rules,
Meteora DBC compatibility, executable Jupiter route, and price reference. A
stock may be visible in the public registry without being launch-compatible.

### 5. Review the market design

The current stock-aware preset explains the opening fee, fee decay, graduation
target, locked-liquidity allocation, and DAMM v2 migration destination. Safety
checks cannot be disabled.

### 6. Run the safety check

Continuity builds the exact unsigned Solana transaction, checks both wallets
and required accounts, and simulates the instructions. A failed simulation
cannot proceed to approval.

### 7. Approve in the operator wallet

Continuity rebuilds with fresh chain data and asks the wallet to approve the
reviewed transaction. The operator may approve or reject it. Nothing is signed
automatically.

### 8. Confirm and register

After Solana confirms the transaction, Continuity stores the new base mint,
Meteora configuration, virtual pool, launch signature, operator, and ClawPump
agent association. The market appears under **Protected markets**.

## What users do after launch

Launching is the start of the market, not the end of the workflow.

An active row under **Protected markets** exposes:

- **Trade** — opens Jupiter with the exact stock quote as the sell asset and
  the new agent token as the buy asset;
- **Pool** — opens the Meteora DBC virtual-pool account on Solscan;
- **Launch** — opens the confirmed creation transaction.

Meteora operates the bonding curve. Jupiter routes users into supported
liquidity. When the reviewed graduation target is reached, the configuration
migrates liquidity to Meteora DAMM v2.

At the same time, Sentinel checks the expected quote mint, issuer lifecycle,
DBC state, curve progress, fee configuration, reserves, and migration state.
If the quote later becomes unsafe, Continuity removes the Trade action from its
interface, stops Continuity-managed automation, records the reason, and alerts
the operator. It cannot freeze, edit, or remove a third-party onchain pool.

## Agent treasury after launch

Meteora can record trading fees claimable by the ClawPump agent wallet bound to
a protected market. Those fees are not the same as the liquidity traders use
inside the pool.

A read-only **Treasury** workspace is live after **Launch** in the product navigation. For each protected
market it reads the official Meteora partner-fee balance, verifies that the
bound ClawPump agent is the fee authority, and shows the SOL retained in that
agent wallet for operations. It never requests a signature or includes pool
reserves, public user balances, or the human operator's funds.

Claiming, swapping, and lending are still locked. Enabling them requires a
verified ClawPump signing path, fixed destinations and caps, operator approval,
receipts, withdrawal support, and an automatic pause whenever Sentinel reports
risk. The complete proposed flow and controls are documented in
[`agent-treasury.md`](agent-treasury.md).

## Why is only `SPCXx` launch-ready today?

The public registry monitors all eight current PreStocks instruments. Registry
coverage and launch approval are deliberately different:

- all eight can be observed for price and lifecycle changes;
- only an exact mint that passes every launch check may enter a Meteora DBC
  transaction.

`SPCXx` currently passes the required checks. Live audits of the other seven
current PreStocks mints confirm their identities and executable routes, but the
mints currently lack the required Meteora DBC quote badge and expose
transfer-fee behavior that the current DBC path cannot safely approve.

Continuity cannot manufacture that badge or pretend away an unsupported token
extension. The badge is an onchain Meteora compatibility control. Marking those
seven assets launch-ready in the UI would make their transactions fail or
bypass the product's central safety promise.

This is not intended as a permanent SPCXx-only product rule, but support is not
automatic in the current build. After an exact mint gains upstream DBC support,
Continuity must add its price-reference adapter and enable it only after the
same identity, lifecycle, transfer, Meteora, route, and reference tests pass.
Until then, it remains visible and monitored but cannot be selected for launch.

## Public, operator, and agent scenarios

### Public user: discover lifecycle risk

1. Open **Markets** without a wallet.
2. Review the eight live instruments and historical records.
3. Open SpaceX to see the `SPACEX → SPCXx` source evidence and deadline.
4. Review protected markets and their latest monitoring state.

### Operator: launch a protected agent market

1. Open **Launch** and connect a wallet.
2. Select or create an owned ClawPump agent.
3. Define a new token.
4. Select a launch-ready stock quote.
5. Review the market design, run simulation, and approve once.
6. Open the confirmed market from **Protected markets** to trade or inspect it.

### ClawPump agent: run Sentinel

An agent can install the Continuity Sentinel skill, request a deterministic
scan, schedule repeated checks, and present the returned evidence and record
hashes. The agent coordinates the workflow; the policy code produces the
verdict. The skill never grants signing authority.

Continuity's own production scheduler is separate from ClawPump's AI-agent
automations. One daily Vercel job runs the Sentinel policy and checks every
registered protected market, storing the results in Supabase. ClawPump
scheduling is an additional way for a particular agent to request and explain
those checks; it is not required to keep the core monitor running.

### External application or AI agent: use MCP/API

MCP is a standard plug between an AI application and a service. Claude, Codex,
wallets, bots, and other applications can use Continuity's MCP or HTTP
interfaces to list lifecycle records, inspect evidence, and request a quote-rail
scan. They receive data and verdicts, not an operator's private key or wallet
authority.

The deployed MCP integration has been tested from the official MCP Inspector.
Screenshots and the exact skill/x402 verification steps are in
[`external-agent-access.md`](external-agent-access.md).

### Paid agent consumer: use x402

x402 is a pay-per-request API. The Sentinel agent can publish the same scan as a
ClawPump-hosted service. An unpaid request is told the small price; an
x402-aware buyer pays it and receives the read-only verdict and proof hashes.
Payment buys one answer, never transaction authority.

The repository file `skills/continuity-sentinel/SKILL.md` tells a ClawPump agent
how to request and explain a Continuity result. It is installed through
**ClawPump Dashboard → Skills → Create Skill**. The paid endpoint is created
through **ClawPump Dashboard → Cloud Service**, not through the Continuity
Launch page.

## What is live, replayed, and still external proof

### Live today

- the complete current PreStocks registry and lifecycle archive;
- authenticated operator sessions and Supabase persistence;
- custom ClawPump-agent and token drafts;
- exact SPCXx eligibility checks;
- stock-aware Meteora DBC construction and Solana simulation;
- explicit wallet approval and confirmation;
- the confirmed mainnet `CONT/SPCXx` market;
- the confirmed mainnet `ORBIT/SPCXx` market;
- persisted protected-market monitoring;
- a dedicated read-only Treasury workspace for claimable agent fees and SOL
  operating reserves;
- read-only HTTP, MCP, skill, scheduled-run, and x402 service code.
- a live ClawPump x402 Cloud Service whose unpaid payment-discovery handshake
  has been verified.

### Replay used for explanation

The `CONT/SPACEX` lifecycle screen is a replay of what Continuity would do if a
managed market depended on the retiring `SPACEX` mint. No live `CONT/SPACEX`
pool is claimed.

### Important execution boundary

The confirmed `CONT/SPCXx` transaction proves first-market creation: it created
the `CONT` mint and DBC market together. Replacing the quote asset of an already
existing pool is impossible; pools are immutable program state. A future
rollover that preserves an existing base mint must use a reviewed pool-creation
route that accepts that mint. Continuity already captures the lifecycle event,
stops managed activity, and prepares the decision evidence, but it does not
claim to rewrite the old pool.

### Final submission proof still to run

The second `ORBIT/SPCXx` market, external MCP client test, and interactive
ClawPump Sentinel skill run are complete. The remaining submission evidence is
operational:

1. trigger the ClawPump scheduled agent automation once, if that runtime is
   included in the final demonstration; and
2. resolve the ClawPump gateway's mainnet/devnet settlement mismatch, then
   complete one paid x402 request.

The exact sequence and expected evidence are in
[`submission-test-runbook.md`](submission-test-runbook.md). Mainnet signatures
belong in [`mainnet-transaction-evidence.md`](mainnet-transaction-evidence.md).

## Sponsor and infrastructure roles

- **PreStocks** supplies the stock instruments, prices, and issuer lifecycle
  evidence.
- **ClawPump** supplies agent identity, wallet, skills, scheduled agent runtime,
  and x402 service hosting.
- **Meteora DBC** creates and operates the bonding curve, fees, graduation rule,
  and DAMM v2 migration.
- **Jupiter** supplies executable routes used for reference checks and opens the
  post-launch trading path.
- **Pyth** independently cross-checks the market reference used by the launch
  policy.
- **Solana** supplies the token accounts, programs, simulation, wallet approval,
  transaction confirmation, and immutable market state.
- **Supabase** stores operator ownership, drafts, preflights, confirmed market
  addresses, source evidence, agent runs, alerts, and monitoring receipts.
- **Continuity** joins these systems into one fail-closed lifecycle policy and a
  product flow people and agents can verify.
