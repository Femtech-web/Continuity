"use client";

import { useEffect, useState } from "react";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import type { PersistedAgentRun } from "@/persistence/agent-run-store";
import styles from "./dashboard.module.css";

type RunsState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | {
      readonly records: readonly PersistedAgentRun[];
      readonly status: "ready";
      readonly storage: {
        readonly integrity: string;
        readonly scope:
          | "LOCAL_APPEND_ONLY"
          | "RUNTIME_EPHEMERAL"
          | "SUPABASE_DURABLE";
      };
    };

function displayState(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export function LiveAgentRuns() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RunsState>({ status: "loading" });
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRuns() {
      try {
        const response = await fetch("/api/v1/sentinel/runs?limit=20", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (
          !response.ok ||
          typeof payload !== "object" ||
          payload === null ||
          !("records" in payload) ||
          !Array.isArray(payload.records) ||
          !("storage" in payload) ||
          typeof payload.storage !== "object" ||
          payload.storage === null ||
          !("scope" in payload.storage) ||
          (payload.storage.scope !== "LOCAL_APPEND_ONLY" &&
            payload.storage.scope !== "RUNTIME_EPHEMERAL" &&
            payload.storage.scope !== "SUPABASE_DURABLE")
        ) {
          throw new Error("Agent-run evidence could not be loaded.");
        }
        setState({
          records: payload.records as PersistedAgentRun[],
          status: "ready",
          storage: {
            integrity: "SHA256_HASH_CHAIN",
            scope: payload.storage.scope,
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "Agent-run evidence could not be loaded.",
          status: "error",
        });
      }
    }

    void loadRuns();
    return () => controller.abort();
  }, [attempt]);

  const runScan = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const response = await fetch("/api/v1/sentinel/runs", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!response.ok) throw new Error("The live scan did not complete.");
      setState({ status: "loading" });
      setAttempt((value) => value + 1);
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "The live scan did not complete.",
        status: "error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className={styles.agentRunSkeleton} aria-label="Loading agent runs">
        <span />
        <span />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <section className={styles.agentRunEmpty} role="status">
        <div>
          <strong>Agent-run evidence is unavailable.</strong>
          <p>{state.message}</p>
        </div>
        <button
          className={styles.secondaryAction}
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
          type="button"
        >
          Retry
        </button>
      </section>
    );
  }

  const latest = state.records[0];

  return (
    <>
      {state.storage.scope === "RUNTIME_EPHEMERAL" ? (
        <section className={styles.persistenceNotice} role="note">
          <div>
            <strong>Run history is temporary on this deployment.</strong>
            <p>
              Live scans work, but Vercel may discard their history between runtimes.
              Durable database storage is required before public paid scans or active-market monitoring.
            </p>
          </div>
          <span>Database required</span>
        </section>
      ) : null}
      <section className={styles.agentChannels} data-tour="agent-access">
        <div>
          <span>ClawPump skill</span>
          <strong>Sentinel is installable</strong>
          <p>Any ClawPump agent can load the Continuity skill and run the same deterministic policy.</p>
          <code>skills/continuity-sentinel/SKILL.md</code>
        </div>
        <div>
          <span>x402 service</span>
          <strong>Paid scans are gateway-ready</strong>
          <p>ClawPump Cloud enforces payment before the read-only scan; payment never grants transaction authority.</p>
          <code>POST /api/v1/scans/quote-rail</code>
        </div>
        <div>
          <span>MCP</span>
          <strong>External agents can inspect and scan</strong>
          <p>Claude, Codex, and MCP clients can query the registry, evidence, and Sentinel policy.</p>
          <code>POST /api/mcp</code>
        </div>
      </section>
      <section className={styles.agentRunSummary}>
        <div>
          <span>Latest deterministic run</span>
          <h2>
            {latest ? displayState(latest.document.decision.verdict) : "No live runs yet"}
          </h2>
          <p>
            {latest
              ? `${displayState(latest.document.decision.action)} · no transaction created`
              : "Run Sentinel to capture PreStocks, Meteora, Jupiter, and Pyth evidence."}
          </p>
        </div>
        {latest ? (
          <dl>
            <div>
              <dt>Evidence</dt>
              <dd>{abbreviateHash(latest.document.evidenceHash)}</dd>
            </div>
            <div>
              <dt>Record</dt>
              <dd>{abbreviateHash(latest.integrity.recordHash)}</dd>
            </div>
            <div>
              <dt>Next scan</dt>
              <dd>{displayTime(latest.document.nextRunAt)} UTC</dd>
            </div>
          </dl>
        ) : null}
        <button
          className={styles.primaryAction}
          disabled={isRunning}
          onClick={() => void runScan()}
          type="button"
        >
          {isRunning ? "Running live checks…" : "Run live scan"}
        </button>
      </section>

      {state.records.length > 0 ? (
        <section className={styles.ledgerSection} aria-labelledby="agent-run-history-title">
          <div className={styles.sectionHeading}>
            <h2 id="agent-run-history-title">Agent-run evidence</h2>
            <p>Latest first · append-only hash chain</p>
          </div>
          <div className={styles.ledgerTable} role="table" aria-label="Sentinel agent runs">
            <div className={`${styles.ledgerHeader} ${styles.agentRunGrid}`} role="row">
              <span role="columnheader">Run</span>
              <span role="columnheader">Trigger</span>
              <span role="columnheader">Verdict</span>
              <span role="columnheader">Evidence</span>
              <span role="columnheader">Record</span>
            </div>
            {state.records.map((record) => (
              <div
                className={`${styles.ledgerRow} ${styles.agentRunGrid}`}
                key={record.document.runId}
                role="row"
              >
                <strong role="cell">{displayTime(record.document.completedAt)} UTC</strong>
                <span role="cell">{displayState(record.document.trigger)}</span>
                <span role="cell">{displayState(record.document.decision.verdict)}</span>
                <code role="cell">{abbreviateHash(record.document.evidenceHash)}</code>
                <code role="cell">{abbreviateHash(record.integrity.recordHash)}</code>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
