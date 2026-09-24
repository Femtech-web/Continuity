"use client";

import { useEffect, useState } from "react";
import type { PreStocksEvidenceBundle } from "@/integrations/prestocks";
import { EvidenceRecord, type EvidenceRecordModel } from "./evidence-record";
import styles from "./dashboard.module.css";

type EvidenceState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly evidence: PreStocksEvidenceBundle; readonly status: "ready" };

function shortHash(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function formatUtc(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function toRecord(evidence: PreStocksEvidenceBundle): EvidenceRecordModel {
  return {
    badge: "Live source",
    sourceName: evidence.snapshot.publisher,
    sourceState: "Captured",
    observedAt: formatUtc(evidence.snapshot.observedAt),
    sourceHash: shortHash(evidence.snapshot.sourceContentSha256),
    manifestState: "Draft · schema valid",
    manifestHash: shortHash(evidence.manifestSha256),
    route: `${evidence.snapshot.sourceInstrument.symbol} → ${evidence.snapshot.lifecycleNotice.successorSymbol}`,
    deadline: "12 Mar 2027 · 23:59 UTC",
    review: "Human review required",
    checks: ["Exact source mint", "Exact successor mint", "Deadline parsed", "Schema valid"],
  };
}

function getErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return "The PreStocks source could not be captured right now.";
}

export function LiveEvidenceRecord() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<EvidenceState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvidence() {
      try {
        const response = await fetch(
          "/api/v1/source-snapshots/prestocks-spacex",
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload));
        setState({ status: "ready", evidence: payload as PreStocksEvidenceBundle });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The PreStocks source could not be captured right now.",
        });
      }
    }

    void loadEvidence();
    return () => controller.abort();
  }, [attempt]);

  if (state.status === "ready") {
    return <EvidenceRecord record={toRecord(state.evidence)} />;
  }

  return (
    <article className={styles.evidenceRecord} aria-busy={state.status === "loading"}>
      <header className={styles.evidenceRecordHeader}>
        <div>
          <span>Lifecycle record</span>
          <h2>SPACEX → SPCXx</h2>
        </div>
        <span className={styles.evidenceBadge}>
          {state.status === "loading" ? "Capturing" : "Unavailable"}
        </span>
      </header>
      {state.status === "loading" ? (
        <div className={styles.evidenceLoading} aria-label="Capturing PreStocks evidence">
          <span />
          <span />
        </div>
      ) : (
        <div className={styles.evidenceUnavailable} role="status">
          <div>
            <strong>Live source unavailable</strong>
            <p>{state.message}</p>
          </div>
          <button
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
            type="button"
          >
            Retry capture
          </button>
        </div>
      )}
    </article>
  );
}
