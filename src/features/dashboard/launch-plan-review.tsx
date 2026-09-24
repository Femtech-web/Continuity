"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import { useWalletAccess } from "@/features/wallet/wallet-access";
import type { MeteoraLaunchPlan } from "@/transactions/meteora-launch-plan";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type PlanState =
  | { readonly status: "idle" | "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly plan: MeteoraLaunchPlan; readonly status: "ready" };

function shortAddress(value: string): string {
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}

function errorMessage(payload: unknown): string {
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
  return "The launch preflight could not be prepared.";
}

export function LaunchPlanReview({
  experience,
}: Readonly<{ experience: DashboardExperience }>) {
  const wallet = useWalletAccess();
  const [state, setState] = useState<PlanState>(
    experience === "demo" ? { status: "loading" } : { status: "idle" },
  );

  const prepare = useCallback(
    async (signal?: AbortSignal) => {
      if (experience === "mainnet" && !wallet.address) {
        wallet.openAccount();
        return;
      }

      setState({ status: "loading" });
      try {
        const response = await fetch(
          experience === "demo"
            ? "/api/demo/launch-plan"
            : "/api/v1/launch-plans/cont-spcxx/preview",
          experience === "demo"
            ? { cache: "no-store", signal }
            : {
                body: JSON.stringify({ authority: wallet.address }),
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                method: "POST",
                signal,
              },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload));
        setState({ plan: payload as MeteoraLaunchPlan, status: "ready" });
      } catch (error) {
        if (signal?.aborted) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "The launch preflight could not be prepared.",
          status: "error",
        });
      }
    },
    [experience, wallet],
  );

  useEffect(() => {
    if (experience !== "demo") return;
    const controller = new AbortController();

    async function loadCapturedPlan() {
      try {
        const response = await fetch("/api/demo/launch-plan", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(payload));
        setState({ plan: payload as MeteoraLaunchPlan, status: "ready" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "The captured launch preflight could not be loaded.",
          status: "error",
        });
      }
    }

    void loadCapturedPlan();
    return () => controller.abort();
  }, [experience]);

  const statusLabel =
    state.status === "ready"
      ? state.plan.mode === "CAPTURED_FIXTURE"
        ? "Captured preflight"
        : state.plan.simulation.state
      : state.status;

  return (
    <article className={styles.transactionReview} aria-busy={state.status === "loading"}>
      <div className={styles.launchReviewHeader}>
        <div className={styles.panelTitle}>
          <div>
            <span>Transaction boundary</span>
            <strong>Instruction and account review</strong>
          </div>
        </div>
        <span className={styles.panelTag}>{statusLabel}</span>
      </div>

      {state.status === "idle" ? (
        <div className={styles.preflightEmpty}>
          <div>
            <strong>Build against the connected operator wallet.</strong>
            <p>
              Continuity authenticates the ClawPump agent, binds its wallet to
              partner economics, builds the DBC transaction, then simulates it.
            </p>
          </div>
          <button
            className={styles.primaryAction}
            disabled={!wallet.isReady}
            onClick={() => void prepare()}
            type="button"
          >
            {wallet.address ? "Prepare live preflight" : "Connect operator wallet"}
            <ProductIcon name="arrow-right" />
          </button>
        </div>
      ) : null}

      {state.status === "loading" ? (
        <div className={styles.preflightSkeleton} aria-label="Preparing transaction preflight">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className={styles.preflightError} role="status">
          <span className={styles.referenceUnavailableIcon}>
            <ProductIcon name="warning" />
          </span>
          <div>
            <strong>Preflight remains blocked</strong>
            <p>{state.message}</p>
          </div>
          <button className={styles.secondaryAction} onClick={() => void prepare()} type="button">
            Retry preflight
          </button>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className={styles.authorityRoute}>
            <div>
              <span>ClawPump partner</span>
              <strong>{state.plan.authority.clawPumpAgentName}</strong>
              <code title={state.plan.authority.clawPumpAgentWallet}>
                {shortAddress(state.plan.authority.clawPumpAgentWallet)}
              </code>
            </div>
            <div>
              <span>Operator signer</span>
              <strong>Connected wallet</strong>
              <code title={state.plan.authority.operatorWallet}>
                {shortAddress(state.plan.authority.operatorWallet)}
              </code>
            </div>
            <div>
              <span>Resulting market</span>
              <strong>CONT / SPCXx</strong>
              <code title={state.plan.transaction.pool}>
                {shortAddress(state.plan.transaction.pool)}
              </code>
            </div>
          </div>

          <div className={styles.transactionBody}>
            <section className={styles.instructionReview}>
              <div className={styles.transactionSectionTitle}>
                <div>
                  <span>Ordered instructions</span>
                  <strong>{state.plan.instructions.length} DBC instructions</strong>
                </div>
                <code>{abbreviateHash(state.plan.transaction.messageHash)}</code>
              </div>
              <div className={styles.instructionList}>
                {state.plan.instructions.map((instruction) => (
                  <div key={`${instruction.index}-${instruction.dataHash}`}>
                    <span>{instruction.index + 1}</span>
                    <div>
                      <strong>{instruction.name}</strong>
                      <code>{shortAddress(instruction.programId)}</code>
                    </div>
                    <small>
                      {instruction.accountCount} accounts · {instruction.writableCount} writes
                    </small>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.accountReview}>
              <div className={styles.transactionSectionTitle}>
                <div>
                  <span>Account diff</span>
                  <strong>{state.plan.accounts.length} key accounts</strong>
                </div>
                <code>{abbreviateHash(state.plan.planHash)}</code>
              </div>
              <div className={styles.accountList}>
                {state.plan.accounts.map((account) => (
                  <div key={account.address}>
                    <span className={styles[`account-${account.change.toLowerCase()}`]}>
                      {account.change}
                    </span>
                    <div>
                      <strong>{account.roles.join(" · ")}</strong>
                      <code title={account.address}>{shortAddress(account.address)}</code>
                    </div>
                    <small>{account.signer ? "Signer" : account.writable ? "Writable" : "Read only"}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.preflightFooter}>
            <div>
              <span
                className={
                  state.plan.simulation.state === "FAILED"
                    ? styles.reviewBlocked
                    : styles.reviewPass
                }
              >
                <ProductIcon
                  name={state.plan.simulation.state === "FAILED" ? "warning" : "check"}
                />
                {state.plan.simulation.state === "CAPTURED_PASS"
                  ? "Captured simulation passed"
                  : state.plan.simulation.state === "PASSED"
                    ? "Live simulation passed"
                    : "Live simulation failed"}
              </span>
              <code>
                {state.plan.simulation.unitsConsumed?.toLocaleString() ?? "—"} compute units
              </code>
            </div>
            <div className={styles.signingDisabled}>
              <span>
                <strong>
                  {state.plan.approval.enabled
                    ? "Ready for deliberate approval"
                    : "Wallet approval unavailable"}
                </strong>
                No signature has been requested or submitted.
              </span>
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}
