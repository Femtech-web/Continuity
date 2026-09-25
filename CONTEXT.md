# Continuity

Continuity is a lifecycle-safety system for tokenized-stock markets. This glossary defines the product language shared by the app, agent, worker, and submission.

## Lifecycle evidence

**Lifecycle Event**:
An issuer-backed change that can make an onchain instrument retired, replaced, restricted, or time-bounded.
_Avoid_: Signal, news event, trade trigger

**Lifecycle Manifest**:
An immutable, machine-readable version of a Lifecycle Event that binds exact mint addresses, effective times, source snapshots, and content hashes.
_Avoid_: AI summary, admin assertion, alert

**Instrument**:
One exact onchain representation of an economic asset, identified by chain, cluster, token program, and mint address.
_Avoid_: Ticker, stock, symbol

## Market protection

**Quote Rail**:
The quote instrument and immutable Meteora DBC configuration on which a ClawPump market depends.
_Avoid_: Trading pair, liquidity route

**Quote-Rail Attestation**:
A reproducible pre-launch check binding a Lifecycle Manifest, quote mint, token badge, Token-2022 state, DBC configuration, market-reference snapshot, and configuration hash.
_Avoid_: Audit, approval

**Sentinel**:
The deterministic Continuity service that evaluates a Quote Rail before launch and while its market is active.
_Avoid_: AI agent, oracle

**Rollover Plan**:
A prepared successor-market configuration and operator checklist produced when an immutable Quote Rail can no longer safely represent the intended quote asset.
_Avoid_: Pool migration, in-place upgrade

**Managed Action**:
A launch, trade, or liquidity action initiated by the Continuity ClawPump agent and therefore subject to Sentinel policy.
_Avoid_: All pool activity, third-party swap

**Live Catalog Instrument**:
An instrument returned by the current PreStocks catalog and actively monitored by Continuity. The live catalog count never includes former instruments kept only as evidence.
_Avoid_: Every instrument ever published by PreStocks

**Lifecycle Archive Record**:
A former instrument or completed lifecycle event preserved to test and explain Continuity's historical handling. It is not presented as a currently available PreStocks market.
_Avoid_: Live market, supported stock

**Protected Market**:
A Meteora DBC market whose launch or Continuity-managed actions are evaluated by Sentinel. Protection does not give Continuity control over third-party swaps or the underlying Meteora program.
_Avoid_: Custodied market, paused pool

**Preflight**:
A no-signature rehearsal that constructs the exact proposed Solana transaction, verifies its accounts and balances, and simulates it before wallet approval is offered.
_Avoid_: Launch, transaction submission

**Market Launch**:
The wallet-approved Solana transaction that creates the Meteora DBC configuration and virtual pool. Continuity reviews and prepares this transaction; Meteora's onchain program creates the market.
_Avoid_: Publishing a page in Continuity

**Market Operator**:
Any visitor who connects a Solana wallet, proves control with a sign-in message, and creates a Protected-Market Draft. The verified wallet owns that draft, pays its Solana costs, and supplies the final launch signature. Public browsing does not make a visitor an operator, and one operator cannot use another operator's mapped ClawPump agent or draft.
_Avoid_: Administrator role, anonymous visitor, trader, Sentinel

**Operator Session**:
A short-lived server session created after a Solana wallet signs a one-time Continuity challenge. It authorizes offchain ownership actions such as creating agents and drafts; it never authorizes an onchain transaction.
_Avoid_: Wallet transaction approval, custody, private key

**Base Token Draft**:
The name, symbol, metadata, supply, and authority policy for the new token a DBC launch will create. It is not an existing mint.
_Avoid_: Deployed token, quote instrument

**Flagship Launch Candidate**:
Continuity's reviewed Base Token Draft for the Continuity Sentinel agent's CONT token, paired with the existing SPCXx quote instrument. It is the first-party proof of the general protection workflow, not evidence that every catalog instrument is launch-enabled.
_Avoid_: Active market, generic operator launch

**Protected Agent Market**:
A Protected Market whose Base Token Draft is associated with an owned ClawPump agent and whose economic receiver is that agent's reviewed wallet. The association does not imply that ClawPump launched or controls the token unless its own launch API is used.
_Avoid_: Arbitrary meme-token pair, AI-managed pool

**Protected-Market Draft**:
An operator-owned proposal pairing a Base Token Draft with a launch-eligible stock quote instrument under Sentinel policy. It has no onchain effect until an authorized Market Launch is signed and confirmed.
_Avoid_: Permissionless launch listing, active market

**Active Protected Market**:
A market that already exists onchain, has been registered with Continuity, and is being reconciled by Sentinel against its reviewed policy and quote-instrument lifecycle.
_Avoid_: Launch candidate, replayed market

## Verdicts

**LAUNCH_SAFE**:
The proposed Quote Rail satisfies every required attestation rule at the recorded observation time.

**MANUAL_REVIEW**:
No hard invariant failed, but missing, stale, or uncertain evidence prevents autonomous launch or action.

**LAUNCH_BLOCKED**:
A proposed market violates a hard identity, authority, token-program, badge, or lifecycle invariant.

**ROLLOVER_REQUIRED**:
An existing or replayed active market depends on a quote instrument that a verified Lifecycle Manifest marks as retiring or superseded.
