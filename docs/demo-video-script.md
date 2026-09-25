# Demo video script

This is a view-only walkthrough. Do not create an agent, sign a wallet message,
submit a transaction, claim fees, or attempt an x402 payment while recording.

Recommended length: **4–5 minutes**.

## Before recording

1. Open the deployed homepage in a fresh browser window.
2. Set browser zoom to 100% and hide bookmarks or private wallet information.
3. Keep these tabs ready:
   - Continuity homepage;
   - `CONT/SPCXx` launch transaction on Solscan;
   - `ORBIT/SPCXx` launch transaction on Solscan.
4. Confirm Markets, Launch, Treasury, Activity, Docs, and the wallet-free replay load.
5. Do not show environment variables, API keys, terminal history, or wallet secrets.

## 0:00–0:35 — Homepage

Show the hero and product-flow illustration.

> Continuity protects AI-agent markets that use tokenized stocks as their quote
> asset. It verifies stock-token lifecycle changes, helps an operator launch a
> reviewed Meteora market, keeps monitoring that market after launch, and
> separates the agent's earned fees from pool liquidity and operator funds.

Scroll to **What Continuity does**.

> Public users can track stock-token changes and evidence. Operators can launch
> protected markets. Agents and external applications can request the same
> source-backed decision through a ClawPump skill, MCP, HTTP, or x402.

## 0:35–1:05 — Docs

Open **Docs** in the homepage navigation. Briefly show the status row, roles,
and end-to-end flow.

> This page keeps the full product understandable from one traceable starting
> point: issuer evidence, the exact stock mint, a wallet-approved launch,
> continuous Sentinel checks, and the agent treasury. It also states the current
> limits instead of presenting planned actions as live.

## 1:05–1:55 — Markets and lifecycle evidence

Open **Mainnet → Markets**.

> Continuity monitors the eight stock tokens in the current PreStocks catalog.
> The lifecycle registry separates current instruments, open transitions, and
> historical records. A wallet is not required to browse it.

Open **SpaceX**, then its source evidence.

> PreStocks identified SPCXx as the successor to the retiring SPACEX token.
> Continuity preserves the source, exact mint addresses, deadline, observation
> time, and hashes. It does not guess a successor from a ticker or news story.

Return to Markets and show **Protected markets**.

> These are real Meteora markets launched through Continuity. CONT/SPCXx proves
> the reference path, and ORBIT/SPCXx proves that another operator-created agent
> and token can use the same workflow. Trade opens the exact Jupiter pair, Pool
> opens the live Meteora account, and Launch opens the creation transaction.

## 1:55–2:35 — Launch

Open **Launch** without starting a new draft.

> A launch uses five stages: choose or create an owned ClawPump agent and define
> its token, choose an eligible stock quote, review the market setup, run the
> full Solana safety check, and approve in the operator wallet. Continuity builds
> and simulates the transaction, but it never signs automatically.

> SPCXx is currently the only launch-enabled stock quote. All eight instruments
> are monitored, but another mint appears here only after its lifecycle,
> transfer behavior, Meteora support, price reference, and route checks pass.

## 2:35–3:15 — Activity

Open **Activity** and show the access cards, latest result, and Sentinel history.

> Sentinel runs automatically each day and stores its decisions in Supabase.
> This history also receives on-demand, MCP, and ClawPump skill checks. Each row
> carries evidence and record hashes, and the list is paginated so the page
> remains usable as the history grows.

> The ClawPump skill and external MCP connection have both been tested. The x402
> service is active and its unpaid payment discovery works; the first paid call
> is deferred until ClawPump aligns the payment network returned by its gateway.

## 3:15–3:50 — Agent treasury

Open **Treasury**.

> Continuity verifies the ClawPump agent that is entitled to each market's
> partner fees. CONT/SPCXx has already accrued 0.00308601 SPCXx in real Meteora
> accounting on Solana mainnet. It is real protocol revenue, but it remains
> unclaimed, so Continuity does not call it wallet cash or lending yield.

> Claiming and vault deposits remain disabled until the exact agent wallet has a
> supported, reviewable signing path. Pool liquidity and operator funds are
> never counted as agent treasury assets.

## 3:50–4:25 — Wallet-free replay

Click **Watch replay**.

> The replay gives judges a deterministic, wallet-free version of the lifecycle
> case. It shows what Continuity would do if a managed market still depended on
> retiring SPACEX: stop its own managed actions, preserve the proof, and prepare
> a separate SPCXx successor configuration. It cannot rewrite or freeze the old
> pool.

## 4:25–4:50 — Mainnet proof and close

Briefly show the two prepared Solscan tabs.

> Both launches are finalized on Solana mainnet and registered for continuing
> protection. Continuity connects source-backed stock lifecycle evidence,
> wallet-reviewed Meteora launches, automatic monitoring, agent access, and a
> verified fee treasury in one product.

Return to the homepage or Docs page for the closing frame.

> Continuity: protected agent markets that keep following their stock quote.
