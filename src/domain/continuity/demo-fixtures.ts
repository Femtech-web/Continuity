import type {
  ContinuityScenario,
  Decision,
  TimelineEvent,
} from "./types";

export const scenarios = [
  {
    id: "wait",
    label: "Review needed",
    eyebrow: "Sentinel verdict",
    title: "REVIEW",
    summary:
      "The quote rail is structurally valid, but the market reference is unavailable for autonomous action.",
    status: "Reference check scheduled · 13:30 UTC",
    tone: "amber",
    action: "Managed action held by policy",
    checks: [
      {
        label: "Lifecycle manifest",
        detail: "Source hash and exact mints verified",
        state: "pass",
      },
      {
        label: "Market reference",
        detail: "Unavailable · retry scheduled",
        state: "watch",
      },
      {
        label: "DBC configuration",
        detail: "Hash matches · action not submitted",
        state: "pass",
      },
    ],
  },
  {
    id: "safe",
    label: "Launch safe",
    eyebrow: "Sentinel verdict",
    title: "LAUNCH SAFE",
    summary:
      "Evidence, exact-mint identity, DBC configuration and market-reference policy agree.",
    status: "Attestation reproducible · config hash matches",
    tone: "mint",
    action: "Review launch transaction",
    checks: [
      {
        label: "Lifecycle manifest",
        detail: "Source hash and exact mints verified",
        state: "pass",
      },
      {
        label: "Quote asset",
        detail: "SPCXx badge and Token-2022 state verified",
        state: "pass",
      },
      {
        label: "DBC configuration",
        detail: "Curve, threshold and authorities attested",
        state: "pass",
      },
    ],
  },
  {
    id: "approval",
    label: "Operator approval",
    eyebrow: "Sentinel verdict",
    title: "REVIEW",
    summary:
      "Every check passes, but the immutable launch configuration still requires operator approval.",
    status: "Launch signature required",
    tone: "cyan",
    action: "Review immutable configuration",
    checks: [
      {
        label: "Lifecycle manifest",
        detail: "Source hash and exact mints verified",
        state: "pass",
      },
      {
        label: "Authority policy",
        detail: "Launch requires operator signature",
        state: "watch",
      },
      {
        label: "DBC configuration",
        detail: "Prepared · awaiting signature",
        state: "pass",
      },
    ],
  },
  {
    id: "rollover",
    label: "Rollover required",
    eyebrow: "Sentinel alert",
    title: "ROLLOVER REQUIRED",
    summary:
      "The replayed market still quotes against a retiring instrument. Continuity holds its agent and prepares a new immutable rail.",
    status: "Prepare CONT / SPCXx · old config unchanged",
    tone: "coral",
    action: "Inspect successor configuration",
    checks: [
      {
        label: "Lifecycle manifest",
        detail: "SPACEX → SPCXx exact mints verified",
        state: "pass",
      },
      {
        label: "DBC quote mint",
        detail: "Still points to SPACEX",
        state: "fail",
      },
      {
        label: "Managed actions",
        detail: "Held by Sentinel policy",
        state: "watch",
      },
    ],
  },
] as const satisfies readonly ContinuityScenario[];

export const timeline = [
  {
    name: "Source snapshot",
    detail: "PreStocks lifecycle notice captured",
    time: "09:41:06",
    status: "verified",
  },
  {
    name: "Manifest published",
    detail: "Exact successor SPCXx · source hash bound",
    time: "09:41:08",
    status: "verified",
  },
  {
    name: "Sentinel verdict",
    detail: "Quote rail requires a successor config",
    time: "09:41:09",
    status: "waiting",
  },
] as const satisfies readonly TimelineEvent[];

export function getScenario(id: Decision): ContinuityScenario {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0];
}
