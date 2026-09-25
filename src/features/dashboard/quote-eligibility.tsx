"use client";

import { useEffect, useState } from "react";
import type { QuoteAssetEligibility } from "@/services/quote-asset-eligibility";
import styles from "./dashboard.module.css";

type EligibilityState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly audit: QuoteAssetEligibility; readonly status: "ready" };

export function QuoteEligibility({ mint }: Readonly<{ mint: string }>) {
  const [state, setState] = useState<EligibilityState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/v1/quote-assets/${mint}/eligibility`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Eligibility audit failed");
        setState({
          audit: (await response.json()) as QuoteAssetEligibility,
          status: "ready",
        });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [mint]);

  if (state.status === "loading") {
    return <p className={styles.quoteEligibilityState}>Checking exact mint eligibility…</p>;
  }
  if (state.status === "error") {
    return <p className={styles.quoteEligibilityState}>Live eligibility could not be refreshed.</p>;
  }
  const firstFailure = state.audit.checks.find((check) => check.state === "FAIL");
  return (
    <div className={styles.quoteEligibilityAudit}>
      <strong>{state.audit.eligible ? "Launch checks passed" : "Not launch-enabled"}</strong>
      <p>
        {state.audit.eligible
          ? "The exact mint passed lifecycle, transfer, Meteora, route, and reference checks."
          : firstFailure?.detail ?? "One or more mandatory quote checks failed."}
      </p>
      <details>
        <summary>View eligibility checks</summary>
        <dl>
          {state.audit.checks.map((check) => (
            <div key={check.key}>
              <dt>{check.label}</dt>
              <dd data-state={check.state}>{check.state}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
