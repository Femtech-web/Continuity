"use client";

import { useEffect, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import type {
  DbcAttestationCheck,
  DbcAttestationState,
} from "@/domain/continuity/dbc-attestation";
import type { MeteoraDbcObservation } from "@/integrations/meteora-dbc";
import styles from "./dashboard.module.css";

type AttestationState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly observation: MeteoraDbcObservation; readonly status: "ready" };

const verdictCopy: Record<
  DbcAttestationState,
  { readonly detail: string; readonly label: string }
> = {
  BLOCKED: {
    label: "Launch blocked",
    detail: "One or more identity checks failed.",
  },
  CONFIG_ATTESTED: {
    label: "Config attested",
    detail: "The reviewed config is onchain; pool launch is pending.",
  },
  POOL_LIVE: {
    label: "Pool live",
    detail: "The pool and its reviewed config are linked onchain.",
  },
  QUOTE_READY: {
    label: "Quote asset verified",
    detail: "SPCXx is eligible; no Continuity config has been submitted.",
  },
};

function iconForCheck(check: DbcAttestationCheck) {
  if (check.state === "PASS") return "check" as const;
  if (check.state === "FAIL") return "warning" as const;
  return "clock" as const;
}

function abbreviate(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-5)}`;
}

export function LiveDbcAttestation() {
  const [state, setState] = useState<AttestationState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttestation() {
      try {
        const response = await fetch("/api/v1/quote-rails/cont-spcxx", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "object" &&
            payload.error !== null &&
            "message" in payload.error &&
            typeof payload.error.message === "string"
              ? payload.error.message
              : "The DBC attestation is temporarily unavailable.";
          throw new Error(message);
        }
        setState({
          observation: payload as MeteoraDbcObservation,
          status: "ready",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "The DBC attestation is temporarily unavailable.",
          status: "error",
        });
      }
    }

    void loadAttestation();
    return () => controller.abort();
  }, []);

  const verdict =
    state.status === "ready"
      ? verdictCopy[state.observation.attestation.state]
      : null;

  return (
    <article className={styles.dbcAttestation} aria-busy={state.status === "loading"}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div>
            <span>Meteora DBC</span>
            <strong>Quote-rail attestation</strong>
          </div>
        </div>
        <span className={styles.panelTag}>
          {state.status === "ready" ? "Live mainnet" : state.status}
        </span>
      </div>

      {state.status === "loading" ? (
        <div className={styles.observationSkeleton} aria-label="Reading Meteora state">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className={styles.observationError} role="status">
          <ProductIcon name="warning" />
          <div>
            <strong>Live read unavailable</strong>
            <p>{state.message}</p>
          </div>
        </div>
      ) : null}

      {state.status === "ready" && verdict ? (
        <>
          <div className={styles.attestationVerdict}>
            <div>
              <span>Current state</span>
              <strong>{verdict.label}</strong>
              <p>{verdict.detail}</p>
            </div>
            <code>{abbreviate(state.observation.addresses.quoteMint)}</code>
          </div>
          <div className={styles.attestationChecks}>
            {state.observation.attestation.checks.map((check) => (
              <div className={styles.attestationCheck} key={check.key}>
                <span
                  className={`${styles.checkState} ${styles[`checkState-${check.state.toLowerCase()}`]}`}
                >
                  <ProductIcon name={iconForCheck(check)} />
                </span>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.detail}</span>
                </div>
                <small>{check.state}</small>
              </div>
            ))}
          </div>
          <div className={styles.attestationMeta}>
            <span>Program {abbreviate(state.observation.addresses.program)}</span>
            <span>Slot {state.observation.provenance.slot.toLocaleString()}</span>
          </div>
        </>
      ) : null}
    </article>
  );
}
