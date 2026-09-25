"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import { formatMantissa } from "@/domain/continuity/stock-threshold";
import type { MeteoraLaunchReview } from "@/integrations/meteora-launch-config";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type ReviewState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly review: MeteoraLaunchReview; readonly status: "ready" };

interface LaunchReviewProps {
  readonly experience: DashboardExperience;
}

export function LaunchReview({ experience }: LaunchReviewProps) {
  const [state, setState] = useState<ReviewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const endpoint =
      experience === "demo"
        ? "/api/demo/launch-review"
        : "/api/v1/launch-reviews/cont-spcxx";

    async function loadReview() {
      try {
        const response = await fetch(endpoint, {
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
              : "The launch review could not be prepared.";
          throw new Error(message);
        }
        setState({ review: payload as MeteoraLaunchReview, status: "ready" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          message:
            error instanceof Error
              ? error.message
              : "The launch review could not be prepared.",
          status: "error",
        });
      }
    }

    void loadReview();
    return () => controller.abort();
  }, [experience]);

  return (
    <article className={styles.launchReview} aria-busy={state.status === "loading"}>
      <div className={styles.launchReviewHeader}>
        <div className={styles.panelTitle}>
          <div>
            <span>Stock-aware DBC preset</span>
            <strong>Unsigned launch review</strong>
          </div>
        </div>
        <span className={styles.panelTag}>
          {state.status === "ready"
            ? state.review.reference.mode === "DEMO_FIXTURE"
              ? "Captured fixture"
              : "Live composite"
            : state.status}
        </span>
      </div>

      {state.status === "loading" ? (
        <div className={styles.launchReviewSkeleton} aria-label="Preparing launch review">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className={styles.referenceUnavailable} role="status">
          <span className={styles.referenceUnavailableIcon}>
            <ProductIcon name="warning" />
          </span>
          <div>
            <strong>Live calibration unavailable</strong>
            <p>{state.message}</p>
          </div>
          {experience === "mainnet" ? (
            <Link href="/demo/launch">
              View captured review <ProductIcon name="arrow-right" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <div className={styles.launchReviewSummary}>
            <div>
              <span>SPCXx / USD reference</span>
              <strong>
                ${formatMantissa(
                  state.review.reference.snapshot.selectedPrice.priceMantissa,
                  state.review.reference.snapshot.selectedPrice.exponent,
                )}
              </strong>
              <small>
                Jupiter direct routes · Pyth SOL/USD cross-check
              </small>
              <small>
                {state.review.reference.evaluation.deviationBps} bps route divergence · {state.review.reference.snapshot.pythSolUsd.publisherCount} Pyth publishers
              </small>
            </div>
            <div className={styles.calibrationResult}>
              <span>Graduation depth</span>
              <strong>{state.review.calibration.quoteAmount} SPCXx</strong>
              <small>${state.review.calibration.targetUsd.toLocaleString()} equivalent · rounded up</small>
            </div>
            <div>
              <span>Configuration hash</span>
              <strong className={styles.hashValue} title={state.review.configuration.hash}>
                {abbreviateHash(state.review.configuration.hash)}
              </strong>
              <small>Canonical draft · unsigned</small>
            </div>
          </div>

          <div className={styles.launchParameters}>
            <div>
              <span>Token</span>
              <strong>
                {(state.review.configuration.design.targetSupply / 1_000_000_000).toLocaleString()}B CONT · 6 decimals
              </strong>
              <small>Fixed supply · immutable authority</small>
            </div>
            <div>
              <span>Opening fee</span>
              <strong>100 → 25 bps</strong>
              <small>15 periods · 900 seconds</small>
            </div>
            <div>
              <span>Protection</span>
              <strong>Dynamic fee on</strong>
              <small>DBC volatility response</small>
            </div>
            <div>
              <span>Migration</span>
              <strong>DAMM v2 · 30 bps</strong>
              <small>0% migration fee</small>
            </div>
            <div>
              <span>Liquidity</span>
              <strong>100% permanent lock</strong>
              <small>50% partner · 50% creator</small>
            </div>
          </div>

          <section className={styles.dbcPolicy} aria-label="Equity Continuity DBC policy">
            <div>
              <span>Equity Continuity v1</span>
              <strong>Stock-aware market policy</strong>
              <p>The launch configuration and lifecycle controls are committed into the same review hash.</p>
            </div>
            <dl>
              <div><dt>Price discovery</dt><dd>100 → 25 bps, then dynamic</dd></div>
              <div><dt>Graduation</dt><dd>$1,000 executable reference</dd></div>
              <div><dt>Lifecycle</dt><dd>Exact mint · source-backed successor</dd></div>
              <div><dt>After launch</dt><dd>Curve, migration, and reference monitored</dd></div>
            </dl>
          </section>

          <div className={styles.launchReviewFooter}>
            <div>
              <span
                className={
                  state.review.reviewState === "READY_FOR_REVIEW"
                    ? styles.reviewPass
                    : styles.reviewBlocked
                }
              >
                <ProductIcon
                  name={state.review.reviewState === "READY_FOR_REVIEW" ? "check" : "warning"}
                />
                {state.review.reviewState === "READY_FOR_REVIEW"
                  ? "Reference policy passed"
                  : "Reference policy blocked"}
              </span>
              <code>{state.review.calibration.quoteBaseUnits} base units</code>
            </div>
            <div className={styles.signingDisabled}>
              <ProductIcon name="shield" />
              <span>
                <strong>Preflight required</strong>
                Wallet approval unlocks only after a fresh simulation passes.
              </span>
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}
