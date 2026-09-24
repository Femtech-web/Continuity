"use client";

import { useEffect, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import type { SolanaMintObservation } from "@/integrations/solana-rpc";
import styles from "./dashboard.module.css";

interface LiveMintObservationProps {
  readonly mint: string;
}

type ObservationState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly observation: SolanaMintObservation; readonly status: "ready" };

export function LiveMintObservation({ mint }: LiveMintObservationProps) {
  const [state, setState] = useState<ObservationState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadObservation() {
      try {
        const response = await fetch(`/api/v1/instruments/${mint}`, {
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
              : "The chain observation is temporarily unavailable.";
          throw new Error(message);
        }

        setState({
          status: "ready",
          observation: payload as SolanaMintObservation,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The chain observation is temporarily unavailable.",
        });
      }
    }

    void loadObservation();
    return () => controller.abort();
  }, [mint]);

  return (
    <article className={styles.panel} aria-busy={state.status === "loading"}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.iconFrameLight}>
            <ProductIcon name="positions" />
          </span>
          <div>
            <span>Solana RPC</span>
            <strong>Exact mint observation</strong>
          </div>
        </div>
        <span className={styles.panelTag}>
          {state.status === "ready" ? "Live read" : state.status}
        </span>
      </div>

      {state.status === "loading" ? (
        <div className={styles.observationSkeleton} aria-label="Reading mint account">
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

      {state.status === "ready" ? (
        <dl className={styles.evidenceList}>
          <div>
            <dt>Token program</dt>
            <dd>{state.observation.instrument.parsedProgram}</dd>
          </div>
          <div>
            <dt>Decimals</dt>
            <dd>{state.observation.instrument.decimals}</dd>
          </div>
          <div>
            <dt>Observed slot</dt>
            <dd>{state.observation.provenance.slot}</dd>
          </div>
          <div>
            <dt>RPC host</dt>
            <dd>{state.observation.provenance.endpointHost}</dd>
          </div>
        </dl>
      ) : null}
    </article>
  );
}
