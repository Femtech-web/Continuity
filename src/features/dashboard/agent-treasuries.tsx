"use client";

import { useEffect, useState } from "react";
import type { AgentTreasurySummary } from "@/services/agent-treasury";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type TreasuryState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly treasuries: readonly AgentTreasurySummary[] };

function compactAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function formatUnits(raw: string, decimals: number, maximumFractionDigits = 4): string {
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals || undefined);
  const fraction = decimals === 0
    ? ""
    : padded.slice(-decimals).slice(0, maximumFractionDigits).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function feeLabel(treasury: AgentTreasurySummary): string {
  if (!treasury.assets) return "Unavailable";
  return `${formatUnits(
    treasury.assets.quote.unclaimed,
    treasury.assets.quote.decimals,
    6,
  )} ${treasury.assets.quote.symbol}`;
}

function TreasuryPreview() {
  return (
    <section className={styles.agentTreasuries} aria-labelledby="agent-treasuries-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>After launch</span>
          <h2 id="agent-treasuries-title">One account for each protected market</h2>
        </div>
        <p>The replay moves no funds. Mainnet reads these balances directly from Solana.</p>
      </div>
      <div className={styles.treasuryPreviewFlow}>
        <div><span>01</span><strong>Market fees accrue</strong><p>Meteora records the agent&apos;s share separately from pool liquidity.</p></div>
        <div><span>02</span><strong>Sentinel keeps watch</strong><p>Unsafe lifecycle or market state pauses future treasury actions.</p></div>
        <div><span>03</span><strong>The agent approves</strong><p>Claims and future deposits require the bound agent wallet.</p></div>
      </div>
    </section>
  );
}

export function AgentTreasuries({
  experience,
}: {
  readonly experience: DashboardExperience;
}) {
  const [state, setState] = useState<TreasuryState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (experience === "demo") return;
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/v1/treasuries", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (
          !response.ok ||
          typeof payload !== "object" ||
          payload === null ||
          !("treasuries" in payload) ||
          !Array.isArray(payload.treasuries)
        ) {
          throw new Error("Treasuries are unavailable.");
        }
        if (active) {
          setState({
            status: "ready",
            treasuries: payload.treasuries as readonly AgentTreasurySummary[],
          });
        }
      } catch {
        if (active && !controller.signal.aborted) setState({ status: "unavailable" });
      }
    };

    const initialTimer = window.setTimeout(() => void load(), 0);
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [experience, requestVersion]);

  if (experience === "demo") return <TreasuryPreview />;

  if (state.status === "loading") {
    return <div className={styles.treasurySkeleton} aria-label="Loading agent treasuries" />;
  }
  if (state.status === "unavailable") {
    return (
      <section className={styles.treasuryUnavailable} role="status">
        <div>
          <strong>Live treasury balances are temporarily unavailable.</strong>
          <p>No balance was inferred. Retry the Solana read when the connection recovers.</p>
        </div>
        <button onClick={() => setRequestVersion((value) => value + 1)} type="button">
          Retry
        </button>
      </section>
    );
  }
  if (state.treasuries.length === 0) {
    return (
      <section className={styles.treasuryUnavailable} role="status">
        <div>
          <strong>No protected-market treasury exists yet.</strong>
          <p>Launch a protected market first; Continuity will register its agent account here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.agentTreasuries} aria-labelledby="agent-treasuries-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Live Solana accounts</span>
          <h2 id="agent-treasuries-title">Protected-market accounts</h2>
        </div>
        <p>Live fee and reserve balances. User funds and pool liquidity are never included.</p>
      </div>

      <div className={styles.treasuryGrid}>
        {state.treasuries.map((treasury) => (
          <article className={styles.treasuryCard} key={treasury.market.id}>
            <header>
              <div>
                <span>{treasury.agent.name}</span>
                <h3>{treasury.market.baseSymbol} / {treasury.market.quoteSymbol}</h3>
              </div>
              <span data-state={treasury.state}>
                {treasury.state === "OBSERVING"
                  ? "Watching"
                  : treasury.state === "PAUSED"
                    ? "Paused"
                    : "Unavailable"}
              </span>
            </header>

            <div className={styles.treasuryMetrics}>
              <div>
                <span>Claimable market fees</span>
                <strong>{feeLabel(treasury)}</strong>
                <small>Earned Meteora partner fees</small>
              </div>
              <div>
                <span>Agent reserve</span>
                <strong>
                  {treasury.agent.walletSolLamports === null
                    ? "—"
                    : `${formatUnits(treasury.agent.walletSolLamports, 9, 5)} SOL`}
                </strong>
                <small>Kept available for agent operations</small>
              </div>
              <div>
                <span>Vault allocation</span>
                <strong>Not active</strong>
                <small>Requires reviewed agent-wallet approval</small>
              </div>
            </div>

            <p>{treasury.statusDetail}</p>
            <footer>
              <span>{compactAddress(treasury.agent.walletAddress)}</span>
              <div>
                <a
                  href={`https://solscan.io/account/${treasury.agent.walletAddress}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Agent wallet ↗
                </a>
                <a
                  href={`https://solscan.io/account/${treasury.market.poolAddress}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Fee source ↗
                </a>
              </div>
            </footer>
          </article>
        ))}
      </div>

      <div className={styles.treasuryBoundary} role="note">
        <strong>Safe by default.</strong>
        <span>
          Continuity observes revenue now. Claiming, swapping, and lending stay locked
          until the bound ClawPump agent can approve the exact reviewed transaction.
        </span>
      </div>
    </section>
  );
}
