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

export function RegisteredMarkets() {
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
    <section className={styles.registeredMarkets} aria-labelledby="protected-markets-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>Post-launch protection</span>
          <h2 id="protected-markets-title">Protected markets</h2>
        </div>
        <p>Lifecycle and liquidity checks continue after approval.</p>
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
            <span role="columnheader">Protection</span>
            <span role="columnheader">Curve</span>
            <span role="columnheader">Last checked</span>
            <span role="columnheader">Launch</span>
          </div>
          {state.markets.map((market) => (
            <div className={styles.registeredMarketRow} key={market.id} role="row">
              <div role="cell">
                <strong>{market.quoteSymbol}</strong>
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
              <a
                href={`https://solscan.io/tx/${market.launchSignature}`}
                rel="noreferrer"
                role="cell"
                target="_blank"
              >
                {compactAddress(market.launchSignature)}
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
