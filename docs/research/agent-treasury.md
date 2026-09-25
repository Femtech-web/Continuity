# Agent treasury research

**Status:** recommended phase 2; not implemented in the current submission  
**Decision date:** 25 September 2026

## Recommendation

Add an **Agent Treasury** after the submission-critical proof is complete, but
do not build a Morpho-style vault that accepts user deposits.

The useful and defensible product is narrower:

> A protected market's ClawPump agent can claim only the revenue its own wallet
> is entitled to receive, keep an operating reserve, and place a capped amount
> into an allowlisted external Solana lending vault.

This makes the agent economically useful after launch without turning
Continuity into a custodian, fund manager, or unaudited vault protocol.

## Where the money actually comes from

Meteora DBC charges trading fees while a token trades in its opening virtual
pool. The DBC configuration splits those fees among the protocol, the launch
partner, and optionally the token creator. The configuration's `fee_claimer`
address is allowed to claim the partner share. After graduation, fee rights can
also arise from locked DAMM liquidity according to the launch configuration.

Continuity's current DBC preset:

- collects curve fees in the quote token;
- sets `creatorTradingFeePercentage` to `0`, so the configurable non-protocol
  curve share belongs to the partner rather than the token creator;
- binds the selected ClawPump agent wallet as `feeClaimer`; and
- binds the same agent wallet as `leftoverReceiver`.

The official Meteora SDK installed in this repository exposes
`claimPartnerTradingFee` and `claimPartnerTradingFeeToReceiver`. Both require
the fee claimer, payer, pool, and maximum claim amounts. This gives Continuity
a concrete claim path; it is not a hypothetical balance scraped from a UI.

The remaining integration gap is signing. The onchain claim authority is the
ClawPump agent wallet, but Continuity's current ClawPump Partner API adapter
only creates and verifies agents; it does not expose an already-proven endpoint
for signing an arbitrary Meteora fee-claim transaction. Before implementation,
the team must verify a documented ClawPump Meteora claim/lending tool or an
approved bounded transaction-signing path. The agent private key must never be
exported into Continuity.

Sources:

- [Meteora Dynamic Bonding Curve program](https://github.com/MeteoraAg/dynamic-bonding-curve)
- [Meteora DBC overview source](https://github.com/MeteoraAg/docs/blob/main/core-products/dbc/what-is-dbc.mdx)
- [Meteora DBC SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk)
- local configuration: `src/integrations/meteora-launch-config.ts`
- local role binding: `src/transactions/meteora-launch-plan.ts`

## What must never move

The treasury must not withdraw or redirect:

- traders' virtual-pool reserves;
- liquidity locked for the DBC or migrated DAMM pool;
- funds in the human operator's wallet;
- stock tokens held by public users; or
- funds belonging to a different ClawPump agent or protected market.

Only a fee balance already claimable by the configured agent, or revenue already
settled to that agent from services such as x402, is treasury money.

## Why the ClawPump agent fits

ClawPump gives each agent its own Solana wallet and documents schedule-based
automations, wallet balances and history, destination whitelists, swaps, and
Jupiter lending support. A custom Continuity skill can tell the agent when a
treasury action is allowed, but deterministic Continuity code must calculate
the cap and safe amount. An LLM must never choose an unlimited amount or bypass
a failed Sentinel verdict.

A dedicated agent per protected market is recommended because it gives each
market a separate wallet, fee history, limits, and receipts. It is not a hard
requirement of the current launch system: an operator can reuse an agent they
already control.

Sources:

- [ClawPump documentation](https://clawpump.tech/docs)
- [ClawPump getting-started guide](https://www.clawpump.tech/guide)
- [ClawPump agent-longevity article](https://clawpump.tech/blog/agents-live-forever)

## First vault target

Jupiter Lend is the cleanest first candidate because:

1. ClawPump already describes Jupiter lending in its agent DeFi stack;
2. Jupiter Lend is a non-custodial Solana lending protocol;
3. its Earn surface accepts supported assets such as SOL, USDC, and USDT; and
4. the agent can keep treasury activity in the same Solana wallet and ecosystem.

This does **not** mean `SPCXx` can be deposited directly. The current DBC fees
are denominated in `SPCXx`, while the lending vault must explicitly support the
exact deposited mint. The first implementation should either:

- retain `SPCXx` in the agent wallet until a reviewed vault supports that mint;
  or
- request explicit approval to swap a capped amount into USDC or SOL, then
  deposit that supported asset.

Kamino and Lulo are credible later adapters, but adding several venues before
one complete claim-to-withdrawal path would weaken testing and increase policy
surface.

Source: [Jupiter Lend Earn](https://jup.ag/lend/earn)

## Safe end-to-end flow

```text
Read claimable DBC partner fees
  → run Sentinel and treasury policy
  → build a bounded claim transaction
  → claim to the market's bound agent wallet
  → keep the configured SOL operating reserve
  → quote an optional SPCXx-to-USDC/SOL conversion
  → enforce slippage, amount, and daily caps
  → deposit into one allowlisted lending vault
  → reconcile the onchain position
  → store a receipt and show it in market activity
```

Withdrawals should reverse the final step into the same agent wallet. Changing
the destination requires a fresh operator review.

## Required controls

- operator activates the policy and approves the first deposit;
- exact agent, DBC pool, fee claimer, assets, and vault are bound in the policy;
- minimum SOL reserve is never invested;
- maximum claim, swap, deposit, and daily amount are enforced in code;
- no borrowing, looping, leverage, or collateralized debt;
- swap slippage and route programs are allowlisted and simulated;
- vault destination is on the ClawPump wallet whitelist;
- `ROLLOVER_REQUIRED`, `LAUNCH_BLOCKED`, stale evidence, or an unhealthy pool
  pauses all new treasury writes;
- claim, swap, deposit, position, yield, withdrawal, and failure events are
  persisted in Supabase; and
- retries are idempotent and reconcile chain state before resubmission.

Yield is variable and not guaranteed. The UI should show current protocol APY
as an observation, never as promised earnings.

## Smallest credible implementation

### Phase 1 — read-only treasury

- read the DBC partner fee balances for each protected market;
- show `claimable`, `claimed`, and `kept as reserve` values;
- show the bound agent wallet and exact fee token;
- add no transaction button until the claim calculation is independently
  tested.

### Phase 2 — reviewed claim

- build and simulate the Meteora partner-fee claim;
- verify a documented ClawPump execution path that signs with the bound agent
  wallet without exporting its private key;
- require the correct agent authority and operator-reviewed maximums;
- submit through the supported ClawPump signing path;
- persist and reconcile the receipt.

### Phase 3 — reviewed lending

- add one USDC or SOL Jupiter Lend destination;
- approve a policy with reserve, caps, and pause conditions;
- perform one claim → optional swap → deposit end to end;
- implement withdrawal and recovery before enabling schedules.

### Phase 4 — bounded automation

- let a ClawPump schedule propose or execute within the approved cap;
- stop automatically on Sentinel risk or protocol health failure;
- surface treasury events alongside market monitoring.

## Why it should not be rushed before the demo

The current submission still needs external proof for the second protected
market, automatic monitoring, MCP, the installed ClawPump skill, and x402.
Those items prove Continuity's central lifecycle product. A live lending feature
adds two new transactions, another protocol, conversion risk, withdrawal
testing, accounting, and agent signing. Shipping a display-only yield card or a
deposit path without withdrawal would be less credible than clearly presenting
this as the next bounded phase.
