# X post verification: Continuity mainnet proof and integration roles

Verified on **25 September 2026**. This note is deliberately narrower than the
README: it records only claims that can safely be used in the launch post and
ties each one to the repository, a finalized Solana RPC read, or an official
protocol source.

## Latest CONT/SPCXx fee verification

At **2026-09-25 19:48:16.232 UTC**, a read from Solana mainnet at `finalized`
commitment and slot **450,451,079** returned the following state for the live
Meteora DBC pool:

| Field | Finalized value |
| --- | --- |
| Market | `CONT/SPCXx` |
| DBC virtual pool | `HSokfXowJKiSvDoQtR3oVTuvBJ7kneUqZVE9pypZCnib` |
| Pool owner / DBC program | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| DBC configuration | `GVmofTcACEyQEdPGTLqiXeZNYBiCEX8wcr7mAkgHSYc` |
| Base mint (`CONT`) | `Hae9BEytCMNaFbdZ8eGnjqsBgG6VzhJqGRtNotkzepua` |
| Quote mint (`SPCXx`) | `Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8` |
| Quote decimals | `8` |
| Partner fee claimer | `2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ` |
| Unclaimed partner base fees | `0` raw `CONT` |
| Claimed partner quote fees | `0` raw `SPCXx` |
| Unclaimed partner quote fees | **`308,601` raw `SPCXx`** |
| Total partner quote fees | **`308,601` raw `SPCXx`** |

The decimal conversion is:

```text
308,601 / 10^8 = 0.00308601 SPCXx
```

**Safe X wording:** “As of 25 September 2026 at 19:48 UTC, the live
CONT/SPCXx Meteora market had accrued `0.00308601 SPCXx` (`308,601` raw units)
in partner-fee accounting for its bound ClawPump agent. The amount remains
unclaimed.”

Do not call this wallet cash, realized revenue, lending yield, or settled funds.
It is **real onchain accrued/claimable protocol revenue**, but it remains in
Meteora's fee accounting. Its fiat value and eventual executability are not
guaranteed.

### Verification method and confidence

The check used the repository-pinned
`@meteora-ag/dynamic-bonding-curve-sdk@1.5.13` against the public Solana mainnet
RPC. It decoded the configured virtual pool with `state.getPool`, its config
with `state.getPoolConfig`, and the raw `creator`/`partner` fee buckets with
`state.getPoolFeeBreakdown`. Solana RPC supplied the finalized slot, pool account
owner, and mint decimals. This is the same read-only method implemented in
[`src/integrations/meteora-dbc.ts`](../src/integrations/meteora-dbc.ts) and
consumed by [`src/services/agent-treasury.ts`](../src/services/agent-treasury.ts).

The official Meteora reference defines `getPoolFeeBreakdown` as returning
claimed, unclaimed, and total creator/partner fees in raw base units, and states
that the config's `feeClaimer` is the partner authority:

- [Official Meteora DBC method reference](https://github.com/MeteoraAg/meteora-invent/blob/main/skills/meteora/references/dbc.md)
- [Official Meteora DBC program](https://github.com/MeteoraAg/dynamic-bonding-curve)
- [Official Solana `getTokenSupply` RPC reference](https://solana.com/docs/rpc/http/gettokensupply)

**Confidence: high.** The fee amount, pool, config, mints, decimals, program
owner, and fee authority were all returned from one finalized mainnet read. The
symbol `SPCXx` and the mapping of the fee-claimer wallet to Continuity Sentinel
come from the repository's exact confirmed launch record. The amount can change
after this timestamp if more swaps or a fee claim occur, so any post should keep
the “as of” time or say “currently” only after another fresh read.

## Mainnet facts safe to use

- The reference launch transaction is finalized on Solana mainnet at slot
  `450,328,456`: [CONT/SPCXx transaction](https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4).
- The separate custom-agent launch is finalized at slot `450,400,048`:
  [ORBIT/SPCXx transaction](https://solscan.io/tx/5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28).
- The confirmed addresses, approval path, simulation outcome, transaction hashes,
  and first monitoring receipts are indexed in
  [`docs/mainnet-transaction-evidence.md`](mainnet-transaction-evidence.md).
- Both launches were approved by the connected human operator. The ClawPump
  agent wallet was assigned partner economics; it did not impersonate or replace
  the operator's launch signature.

## Verified roles for the post

| Technology | What Continuity actually uses it for | Important boundary |
| --- | --- | --- |
| **ClawPump** | Creates and verifies owned agents through its Partner API; supplies each agent's Solana wallet and identity; that wallet becomes the market's Meteora partner-fee authority and leftover receiver. Continuity also installed a Sentinel skill, proved an interactive ClawPump Chat run, and deployed the scan through ClawPump x402 Cloud. See [`clawpump.ts`](../src/integrations/clawpump.ts), [`meteora-launch-plan.ts`](../src/transactions/meteora-launch-plan.ts), the [`Continuity Sentinel skill`](../skills/continuity-sentinel/SKILL.md), and [`external-agent-access.md`](external-agent-access.md). | ClawPump did not sign the human operator's DBC launch. The repo explicitly uses `METEORA_SDK_OPERATOR_SIGNED`. Fee claiming is not enabled because no supported public ClawPump route for this exact Meteora claim is documented. |
| **PreStocks** | Supplies the current instrument catalog, exact Solana mints, and source lifecycle evidence. The adapter captures and hashes the issuer page, then validates the exact `SPACEX -> SPCXx` successor and deadline before building a manifest. See [`prestocks.ts`](../src/integrations/prestocks.ts). | Monitoring all catalog instruments does not mean all are launch-enabled. Only the exact reviewed `SPCXx` mint passes the current route. |
| **Meteora DBC** | Builds the stock-quoted token launch, bonding curve, fee policy, graduation configuration, and later DAMM v2 migration path. After launch, Continuity reads the live pool, reserves, curve/migration state, fee configuration, fee authority, and partner-fee balances with the official SDK. See [`meteora-launch-config.ts`](../src/integrations/meteora-launch-config.ts), [`meteora-launch-plan.ts`](../src/transactions/meteora-launch-plan.ts), and [`meteora-dbc.ts`](../src/integrations/meteora-dbc.ts). | The live DBC pools have not graduated yet; no migration pool should be claimed. |
| **Jupiter** | Requests direct executable `SPCXx -> USDC` and `SPCXx -> wrapped SOL` quotes for route and market-value verification. Protected markets also expose an exact-mint Jupiter trade link. See [`jupiter-quote.ts`](../src/integrations/jupiter-quote.ts) and [`registered-markets.tsx`](../src/features/dashboard/registered-markets.tsx). | Continuity verifies the route and opens Jupiter; it does not execute the user's post-launch trade itself. |
| **Pyth Pro** | Authenticated Pyth Pro feed `6`, `Crypto.SOL/USD`, independently cross-checks the SOL leg used in the composite stock-quote reference. The policy validates price, confidence, publisher count, market session, and freshness. See [`pyth-pro.ts`](../src/integrations/pyth-pro.ts) and [`composite-market-reference.ts`](../src/domain/continuity/composite-market-reference.ts). | Pyth does not provide a direct SPCXx or stock-price feed in this implementation. Its role is the independent SOL/USD cross-check. |
| **Supabase** | Stores authenticated operator ownership, agent mappings, drafts, launch attempts, confirmed protected markets, lifecycle manifests, monitoring snapshots, alerts, Sentinel runs, and hash-linked receipts. See [`supabase-rest.ts`](../src/persistence/supabase-rest.ts), [`market-monitoring-store.ts`](../src/persistence/market-monitoring-store.ts), and the [`migrations`](../supabase/migrations). | Supabase is the durable ownership/workflow/evidence index; Solana remains the source of truth for the onchain market and fee balance. |
| **MCP** | Exposes three external-agent tools: list the lifecycle registry, retrieve source-backed evidence, and request the same deterministic read-only quote-rail scan. See [`continuity-mcp.ts`](../src/services/continuity-mcp.ts) and the [`/api/mcp` handler](../src/app/api/mcp/route.ts). | MCP grants no wallet or transaction authority. A requested scan is read-only financially, but it does persist an evidence record. |
| **x402 / ClawPump Cloud** | Places ClawPump's payment/distribution layer in front of the same read-only Sentinel scan. The Cloud Service is deployed, and an unpaid request proved the expected HTTP `402` discovery flow. See the [`scan route`](../src/app/api/v1/scans/quote-rail/route.ts) and [`external-agent-access.md`](external-agent-access.md). | Do not claim a successful paid request or settlement. The observed Cloud metadata/payment header currently disagree on mainnet versus devnet, so payment was intentionally deferred. |

## Strong but accurate ClawPump emphasis

The broadest defensible claim is:

> We used ClawPump across the agent lifecycle: operator-owned agent creation and
> binding, agent identity and wallet verification, onchain Meteora partner-fee
> authority, an installable Continuity Sentinel skill, interactive agent scans,
> and x402 Cloud distribution. The human operator still reviews and signs every
> market launch, and fee claiming remains locked until ClawPump exposes a
> supported reviewable signing route for that exact action.

Avoid “ClawPump launched the pool,” “the agent autonomously claimed revenue,”
or “x402 revenue is live.” Those claims are not supported by the current build.

## Compact sponsor/stack copy

> PreStocks supplies the instruments, exact mints, and lifecycle evidence.
> ClawPump supplies the agent identity, wallet/fee authority, Sentinel skill,
> and x402 distribution. Meteora supplies DBC launch, partner-fee accounting,
> and the DAMM v2 migration path. Jupiter proves executable routes and opens the
> live trade pair. Pyth Pro independently cross-checks SOL/USD. Supabase stores
> authenticated ownership, launches, and hash-linked monitoring history. MCP
> gives external agents the same source-backed, read-only verdict.

