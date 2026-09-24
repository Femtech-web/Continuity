"use client";

import { useState } from "react";
import {
  ProductIcon,
  type ProductIconName,
} from "@/components/product-icon";
import { getScenario, scenarios } from "@/domain/continuity/demo-fixtures";
import type {
  CheckState,
  Decision,
  DecisionTone,
} from "@/domain/continuity/types";
import styles from "./decision-console.module.css";

interface DecisionConsoleProps {
  readonly expanded?: boolean;
  readonly initialDecision?: Decision;
  readonly quiet?: boolean;
}

const verdictIcons: Record<Decision, ProductIconName> = {
  approval: "policy",
  rollover: "route",
  safe: "shield",
  wait: "clock",
};

const checkIcons: Record<CheckState, ProductIconName> = {
  fail: "warning",
  pass: "check",
  watch: "clock",
};

const toneClasses: Record<DecisionTone, string> = {
  amber: styles.amber,
  coral: styles.coral,
  cyan: styles.cyan,
  mint: styles.mint,
};

const checkStateClasses: Record<CheckState, string> = {
  fail: styles.checkIconFail,
  pass: styles.checkIconPass,
  watch: styles.checkIconWatch,
};

export function DecisionConsole({
  expanded = false,
  initialDecision = "wait",
  quiet = false,
}: DecisionConsoleProps) {
  const [activeId, setActiveId] = useState<Decision>(initialDecision);
  const activeScenario = getScenario(activeId);
  const executionHeld = activeScenario.id === "wait";

  return (
    <section
      className={`${styles.console} ${expanded ? styles.expanded : ""} ${quiet ? styles.quiet : ""}`}
      aria-label="Guardian decision console"
    >
      <div className={styles.bar}>
        <div className={styles.caseLabel}>
          <span className={styles.caseIcon}>
            <ProductIcon name="shield" />
          </span>
          <span>Quote-rail lifecycle replay</span>
        </div>
        <span className={styles.monoLabel}>REPLAY · QR-0427</span>
      </div>

      <div
        className={styles.switcher}
        aria-label="Preview decision states"
        role="tablist"
      >
        {scenarios.map((scenario) => (
          <button
            className={`${styles.tab} ${scenario.id === activeScenario.id ? styles.activeTab : ""}`}
            key={scenario.id}
            onClick={() => setActiveId(scenario.id)}
            aria-selected={scenario.id === activeScenario.id}
            role="tab"
            type="button"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className={styles.body} aria-live="polite">
        <div className={styles.summary}>
          <span className={styles.microLabel}>{activeScenario.eyebrow}</span>
          <div
            className={`${styles.verdictRow} ${toneClasses[activeScenario.tone]}`}
          >
            <span className={styles.verdictIcon}>
              <ProductIcon name={verdictIcons[activeScenario.id]} />
            </span>
            <strong className={styles.verdict}>{activeScenario.title}</strong>
          </div>
          <p className={styles.summaryText}>{activeScenario.summary}</p>
          <div className={styles.decisionStatus}>
            <span>{activeScenario.status}</span>
            <span>Updated just now</span>
          </div>
        </div>

        <div className={styles.checks}>
          {activeScenario.checks.map((check) => (
            <div className={styles.checkRow} key={check.label}>
              <span
                className={`${styles.checkIcon} ${checkStateClasses[check.state]}`}
              >
                <ProductIcon name={checkIcons[check.state]} />
              </span>
              <div className={styles.checkCopy}>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </div>
              <span className={styles.checkState}>{check.state}</span>
            </div>
          ))}
          <button
            className={styles.action}
            disabled={executionHeld}
            type="button"
          >
            {activeScenario.action}
            <ProductIcon name={executionHeld ? "clock" : "arrow-right"} />
          </button>
        </div>
      </div>
    </section>
  );
}
