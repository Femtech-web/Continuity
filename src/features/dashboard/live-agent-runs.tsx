"use client";

import { useCallback, useEffect, useState } from "react";
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

const SENTINEL_HISTORY_REFRESH_MS = 15_000;
const SENTINEL_HISTORY_PAGE_SIZE = 8;
const SENTINEL_HISTORY_FETCH_LIMIT = 100;

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
  const [historyPage, setHistoryPage] = useState(0);

  const loadRuns = useCallback(
    async (signal: AbortSignal, background = false) => {
      try {
        const response = await fetch(
          `/api/v1/sentinel/runs?limit=${SENTINEL_HISTORY_FETCH_LIMIT}`,
          {
            cache: "no-store",
            signal,
          },
        );
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
        const records = payload.records as PersistedAgentRun[];
        setState({
          records,
          status: "ready",
          storage: {
            integrity: "SHA256_HASH_CHAIN",
            scope: payload.storage.scope,
          },
        });
        setHistoryPage((currentPage) =>
          Math.min(
            currentPage,
            Math.max(0, Math.ceil(records.length / SENTINEL_HISTORY_PAGE_SIZE) - 1),
          ),
        );
      } catch (error) {
        if (signal.aborted || background) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "Agent-run evidence could not be loaded.",
          status: "error",
        });
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let refreshInFlight = false;

    const refreshInBackground = async () => {
      if (
        refreshInFlight ||
        controller.signal.aborted ||
        document.visibilityState !== "visible"
      ) {
        return;
      }
      refreshInFlight = true;
      try {
        await loadRuns(controller.signal, true);
      } finally {
        refreshInFlight = false;
      }
    };

    const initialLoadTimer = window.setTimeout(
      () => void loadRuns(controller.signal),
      0,
    );
    const refreshTimer = window.setInterval(
      () => void refreshInBackground(),
      SENTINEL_HISTORY_REFRESH_MS,
    );
    const refreshWhenVisible = () => void refreshInBackground();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [attempt, loadRuns]);

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
  const historyPageCount = Math.max(
    1,
    Math.ceil(state.records.length / SENTINEL_HISTORY_PAGE_SIZE),
  );
  const historyStart = historyPage * SENTINEL_HISTORY_PAGE_SIZE;
  const visibleRecords = state.records.slice(
    historyStart,
    historyStart + SENTINEL_HISTORY_PAGE_SIZE,
  );

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
          <strong>Run checks from ClawPump</strong>
          <p>ClawPump agents can use Sentinel to check a stock token before acting.</p>
          <code>skills/continuity-sentinel/SKILL.md</code>
        </div>
        <div>
          <span>x402 service</span>
          <strong>Offer paid market checks</strong>
          <p>Agents can pay for a read-only check without receiving control of a wallet.</p>
          <code>POST /api/v1/scans/quote-rail</code>
        </div>
        <div>
          <span>MCP</span>
          <strong>Connect external agents</strong>
          <p>Claude, Codex, and other MCP clients can inspect markets and request checks.</p>
          <code>POST /api/mcp</code>
        </div>
      </section>
      <section className={styles.agentRunSummary}>
        <div>
          <span>Latest check</span>
          <h2>
            {latest ? displayState(latest.document.decision.verdict) : "No live runs yet"}
          </h2>
          <p>
            {latest
              ? `${displayState(latest.document.decision.action)} · automatic checks run daily`
              : "Continuity checks automatically each day. You can also check now."}
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
          {isRunning ? "Checking now…" : "Check now"}
        </button>
      </section>

      {state.records.length > 0 ? (
        <section className={styles.ledgerSection} aria-labelledby="agent-run-history-title">
          <div className={styles.sectionHeading}>
            <h2 id="agent-run-history-title">Sentinel history</h2>
            <p>Updates automatically · newest first · each result is tamper-evident</p>
          </div>
          <div className={styles.ledgerTable} role="table" aria-label="Sentinel agent runs">
            <div className={`${styles.ledgerHeader} ${styles.agentRunGrid}`} role="row">
              <span role="columnheader">Run</span>
              <span role="columnheader">Trigger</span>
              <span role="columnheader">Verdict</span>
              <span role="columnheader">Evidence</span>
              <span role="columnheader">Record</span>
            </div>
            {visibleRecords.map((record) => (
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
          {state.records.length > SENTINEL_HISTORY_PAGE_SIZE ? (
            <nav className={styles.ledgerPagination} aria-label="Sentinel history pages">
              <p>
                Showing {historyStart + 1}–
                {Math.min(
                  historyStart + SENTINEL_HISTORY_PAGE_SIZE,
                  state.records.length,
                )}{" "}
                of {state.records.length} recent checks
              </p>
              <div>
                <button
                  disabled={historyPage === 0}
                  onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
                  type="button"
                >
                  Previous
                </button>
                <span aria-live="polite">
                  Page {historyPage + 1} of {historyPageCount}
                </span>
                <button
                  disabled={historyPage >= historyPageCount - 1}
                  onClick={() =>
                    setHistoryPage((page) => Math.min(historyPageCount - 1, page + 1))
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </nav>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
