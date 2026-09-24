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

## Verdicts

**LAUNCH_SAFE**:
The proposed Quote Rail satisfies every required attestation rule at the recorded observation time.

**MANUAL_REVIEW**:
No hard invariant failed, but missing, stale, or uncertain evidence prevents autonomous launch or action.

**LAUNCH_BLOCKED**:
A proposed market violates a hard identity, authority, token-program, badge, or lifecycle invariant.

**ROLLOVER_REQUIRED**:
An existing or replayed active market depends on a quote instrument that a verified Lifecycle Manifest marks as retiring or superseded.

