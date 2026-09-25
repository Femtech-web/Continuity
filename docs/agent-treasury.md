# Agent treasury

Continuity gives each protected market a clear view of the money assigned to
its ClawPump agent. The page is called **Treasury**, not **Earn** or **Yield**,
because it currently reports real balances without promising an investment
return.

## What is live

For every market launched through Continuity, the Treasury page:

- reads the market's live Meteora partner-fee balance from Solana;
- verifies that the fee recipient is the ClawPump agent registered to that
  market;
- shows the SOL held by that agent for operating costs;
- refreshes the read-only figures automatically; and
- pauses the display when the authority or protected-market state is wrong.

No wallet signature is requested by this read. No funds move.

## What the CONT balance means

The `CONT/SPCXx` market currently reports `308,601` raw units of claimable
quote-token fees. `SPCXx` has eight decimal places, so that is:

```text
308,601 ÷ 100,000,000 = 0.00308601 SPCXx
```

This is a real amount recorded by the Meteora market for the agent's fee
authority. It is not yet in the agent wallet, not yet converted into SOL or
USDC, and not deposited into a lending vault. Its cash value is not guaranteed;
that depends on whether a safe executable market exists when a claim or swap is
reviewed.

## Where the money comes from

Meteora DBC collects trading fees while people buy and sell through the opening
market. The launch configuration assigns the partner share to the protected
market's ClawPump agent wallet. That share is separate from:

- traders' pool liquidity;
- tokens held by public users;
- the human operator's wallet; and
- money assigned to any other protected market.

Continuity reads only the amount the market already attributes to that agent.
It does not treat pool reserves as treasury money.

## Why there is no Claim button yet

Meteora's DBC SDK exposes `claimPartnerTradingFee`, but it builds an unsigned
transaction. The exact ClawPump agent wallet configured as fee authority must
sign it. ClawPump signs through
approved purpose-built tools, including swaps, transfers, lending, and x402
payments. As checked on 25 September 2026, the public Partner API and official
134-tool catalog do not document either a generic Solana transaction signer or
a Meteora partner-fee claim tool.

This does not mean ClawPump cannot sign transactions or that no private/internal
route exists. It means Continuity does not currently have a supported public
route for this exact instruction, so it must not build a financial feature on
an undocumented interface.

Continuity will not export the agent's private key, ask the human operator to
pretend to be the agent, or show a button that cannot safely complete. A claim
can be enabled only after the agent can review and sign the exact transaction
through a supported ClawPump path.

### Requested ClawPump integration

The preferred upstream capability is a bounded
`meteora_claim_partner_fees` tool. A reviewed generic transaction flow would
also work if it verifies agent ownership, allowlists the exact program and
instruction, decodes every account and amount, simulates before signing,
enforces caps and idempotency, requires explicit confirmation, and returns the
signature and resulting balances. The agent private key must remain inside
ClawPump.

## The intended money flow

```text
Meteora records the agent's market fees
  → Continuity verifies the market and fee authority
  → the bound agent reviews and signs a capped claim
  → claimed assets arrive in that same agent wallet
  → a fixed SOL operating reserve stays untouched
  → the operator may approve a capped swap to SOL or USDC
  → the agent may deposit that supported asset into one allowlisted vault
  → Continuity reconciles the position and stores a receipt
```

If Sentinel detects an unsafe stock-token lifecycle or market state, new
treasury actions stop. Existing user liquidity remains in the underlying
protocol; Continuity cannot freeze or seize it.

## Safe yield scope

The first lending integration should be deliberately narrow:

- one audited Solana lending destination;
- only SOL or USDC if that destination supports the exact mint;
- no public deposits into Continuity;
- no borrowing, leverage, looping, or collateralized debt;
- a minimum SOL reserve that cannot be invested;
- per-action and daily limits enforced in deterministic code;
- a simulated transaction and explicit first approval; and
- a tested withdrawal path before scheduled deposits are enabled.

`SPCXx` must not be deposited directly unless the chosen vault explicitly
supports that exact mint. Otherwise a separate, capped swap must be reviewed
first.

## Delivery status

| Phase | Status | Meaning |
| --- | --- | --- |
| Read balances | Live | Fees, authority, and agent SOL are read from Solana |
| Claim fees | Locked | Waiting for a supported ClawPump agent-wallet signing path |
| Deposit to vault | Not active | Requires a reviewed claim, asset conversion, and withdrawal test |
| Scheduled treasury actions | Not active | Requires caps, receipts, reconciliation, and Sentinel pause rules |

## Primary references

- [Meteora Dynamic Bonding Curve program](https://github.com/MeteoraAg/dynamic-bonding-curve)
- [Meteora DBC method and signing reference](https://github.com/MeteoraAg/meteora-invent/blob/main/skills/meteora/references/dbc.md)
- [ClawPump official MCP tool catalog](https://github.com/Clawpump/claw-agent/blob/main/skills/clawpump/SKILL.md)
- [ClawPump Partner API](https://clawpump.tech/developers)
- [Jupiter Lend Earn](https://jup.ag/lend/earn)
