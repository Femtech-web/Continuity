"use client";

import { useEffect, useState } from "react";
import type { ProtectedMarketSummary } from "@/persistence/market-monitoring-store";
import styles from "./dashboard.module.css";

type MarketState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly markets: readonly ProtectedMarketSummary[]; readonly status: "ready" };

function compactAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function displayTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function displayState(value: string): string {
  return value.toLowerCase().split("_").map(
    (part) => part.charAt(0).toUpperCase() + part.slice(1),
  ).join(" ");
}

function jupiterTradeUrl(market: ProtectedMarketSummary): string {
  const parameters = new URLSearchParams({
    buy: market.baseMint,
    sell: market.quoteMint,
  });
  return `https://jup.ag/?${parameters.toString()}`;
}

export function RegisteredMarkets({ compact = false }: Readonly<{ compact?: boolean }>) {
  const [state, setState] = useState<MarketState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/protected-markets", {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        typeof payload !== "object" ||
        payload === null ||
        !("markets" in payload) ||
        !Array.isArray(payload.markets)
      ) {
        throw new Error("Registered markets are unavailable.");
      }
      setState({
        markets: payload.markets as readonly ProtectedMarketSummary[],
        status: "ready",
      });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: "unavailable" });
    });
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <div className={styles.marketMonitorSkeleton} aria-label="Loading protected markets" />;
  }

  if (state.status === "unavailable") return null;

  return (
    <section
      className={`${styles.registeredMarkets} ${compact ? styles.registeredMarketsCompact : ""}`}
      aria-labelledby="protected-markets-title"
      id="protected-markets"
    >
      <div className={styles.sectionHeading}>
        <div>
          <span>Sentinel protected</span>
          <h2 id="protected-markets-title">Protected markets</h2>
        </div>
        <p>Launched through Continuity and continuously checked after launch.</p>
      </div>
      {state.markets.length === 0 ? (
        <div className={styles.registeredMarketEmpty}>
          <strong>No market has been launched through Continuity.</strong>
          <p>The first confirmed market will appear here and enter Sentinel monitoring.</p>
        </div>
      ) : (
        <div className={styles.registeredMarketTable} role="table" aria-label="Protected markets">
          <div className={styles.registeredMarketHeader} role="row">
            <span role="columnheader">Market</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Curve progress</span>
            <span role="columnheader">Last check</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.markets.map((market) => (
            <div className={styles.registeredMarketRow} key={market.id} role="row">
              <div role="cell">
                <strong>{market.baseSymbol} / {market.quoteSymbol}</strong>
                <span>{compactAddress(market.baseMint)} / {compactAddress(market.quoteMint)}</span>
              </div>
              <span data-state={market.status} role="cell">{displayState(market.status)}</span>
              <span role="cell">
                {market.latestObservation?.curveProgressBps === null ||
                market.latestObservation?.curveProgressBps === undefined
                  ? "Pending"
                  : `${(market.latestObservation.curveProgressBps / 100).toFixed(2)}%`}
              </span>
              <span role="cell">
                {market.latestObservation
                  ? `${displayTime(market.latestObservation.observedAt)} UTC`
                  : "Awaiting first scan"}
              </span>
              <div className={styles.registeredMarketActions} role="cell">
                {market.status === "ACTIVE" || market.status === "GRADUATED" ? (
                  <a
                    href={jupiterTradeUrl(market)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Trade ↗
                  </a>
                ) : null}
                <a
                  href={`https://solscan.io/account/${market.virtualPoolAddress}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Pool ↗
                </a>
                <a
                  href={`https://solscan.io/tx/${market.launchSignature}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Launch ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
