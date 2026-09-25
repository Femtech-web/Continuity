import { canonicalSha256 } from "./canonical-json.ts";
import type {
  QuoteRailReasonCode,
  QuoteRailVerdictCode,
} from "./quote-rail.ts";
import type { DbcAttestationState } from "./dbc-attestation.ts";

export type SentinelRunTrigger =
  | "MCP"
  | "CLAWPUMP_SKILL"
  | "CLAWPUMP_X402"
  | "ON_DEMAND"
  | "SCHEDULED";

export interface SentinelRunDocument {
  readonly schemaVersion: "1.0.0";
  readonly runId: string;
  readonly idempotencyKey: string;
  readonly subject: {
    readonly baseSymbol: "CONT";
    readonly market: "CONT/SPCXx";
    readonly quoteSymbol: "SPCXx";
  };
  readonly trigger: SentinelRunTrigger;
  readonly evaluatedAt: string;
  readonly completedAt: string;
  readonly evidence: {
    readonly manifest: SentinelManifestEvidence;
    readonly marketReference: SentinelMarketReferenceEvidence;
    readonly meteora: SentinelAttestationEvidence;
  };
  readonly evidenceHash: string;
  readonly decision: {
    readonly action:
      | "NONE"
      | "REVIEW_MANIFEST"
      | "PREPARE_ROLLOVER"
      | "RESOLVE_BLOCKER";
    readonly reasonCodes: readonly QuoteRailReasonCode[];
    readonly verdict: QuoteRailVerdictCode;
  };
  readonly execution: {
    readonly transaction: "NOT_CREATED";
    readonly walletSignature: "NOT_REQUESTED";
  };
  readonly payment: {
    readonly provider: "CLAWPUMP_X402" | "NONE";
    readonly status: "EXTERNAL_GATEWAY_UNVERIFIED" | "NOT_APPLICABLE";
  };
  readonly nextRunAt: string;
}

export interface SentinelManifestEvidence {
  readonly deadlineAt: string;
  readonly hash: string;
  readonly id: string;
  readonly reviewStatus: "REVIEWED" | "UNREVIEWED";
  readonly snapshotHash: string;
  readonly version: number;
}

export interface SentinelMarketReferenceEvidence {
  readonly hash: string;
  readonly observedAt: string;
  readonly status: "FRESH" | "MISSING" | "STALE";
}

export interface SentinelAttestationEvidence {
  readonly configurationHash: string;
  readonly hash: string;
  readonly slot: number;
  readonly state: DbcAttestationState;
}

interface MonitoringIntervalInput {
  readonly deadlineAt: string;
  readonly evaluatedAt: string;
  readonly verdict: QuoteRailVerdictCode;
}

interface BuildSentinelRunDocumentInput {
  readonly attestation: SentinelAttestationEvidence;
  readonly evaluatedAt: string;
  readonly idempotencyKey: string;
  readonly manifest: SentinelManifestEvidence;
  readonly marketReference: SentinelMarketReferenceEvidence;
  readonly runId: string;
  readonly trigger: SentinelRunTrigger;
  readonly verdict: {
    readonly code: QuoteRailVerdictCode;
    readonly reasons: readonly QuoteRailReasonCode[];
  };
}

function timestamp(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field} must be ISO-8601`);
  return parsed;
}

/** Implements the deadline-aware cadence in the approved Sentinel policy. */
export function monitoringIntervalSeconds(
  input: MonitoringIntervalInput,
): number {
  const remainingMs =
    timestamp(input.deadlineAt, "deadlineAt") -
    timestamp(input.evaluatedAt, "evaluatedAt");
  const day = 86_400_000;

  if (remainingMs <= day) return 600;
  if (remainingMs <= 7 * day) return 3_600;
  if (remainingMs <= 30 * day) return 21_600;

  // A hard blocker still needs prompt recovery checks even with a distant deadline.
  if (input.verdict === "LAUNCH_BLOCKED") return 21_600;
  return 86_400;
}

function actionForVerdict(
  verdict: QuoteRailVerdictCode,
  reasons: readonly QuoteRailReasonCode[],
): SentinelRunDocument["decision"]["action"] {
  if (verdict === "LAUNCH_SAFE") return "NONE";
  if (verdict === "ROLLOVER_REQUIRED") return "PREPARE_ROLLOVER";
  if (reasons.includes("LIFECYCLE_REVIEW_REQUIRED")) return "REVIEW_MANIFEST";
  return "RESOLVE_BLOCKER";
}

/** Builds the portable receipt returned by on-demand, scheduled, and x402 runs. */
export async function buildSentinelRunDocument(
  input: BuildSentinelRunDocumentInput,
): Promise<SentinelRunDocument> {
  timestamp(input.evaluatedAt, "evaluatedAt");
  const evidence = Object.freeze({
    manifest: Object.freeze({ ...input.manifest }),
    marketReference: Object.freeze({ ...input.marketReference }),
    meteora: Object.freeze({ ...input.attestation }),
  });
  const intervalSeconds = monitoringIntervalSeconds({
    deadlineAt: input.manifest.deadlineAt,
    evaluatedAt: input.evaluatedAt,
    verdict: input.verdict.code,
  });
  const nextRunAt = new Date(
    Date.parse(input.evaluatedAt) + intervalSeconds * 1_000,
  ).toISOString();

  return Object.freeze({
    schemaVersion: "1.0.0" as const,
    runId: input.runId,
    idempotencyKey: input.idempotencyKey,
    subject: Object.freeze({
      baseSymbol: "CONT" as const,
      market: "CONT/SPCXx" as const,
      quoteSymbol: "SPCXx" as const,
    }),
    trigger: input.trigger,
    evaluatedAt: input.evaluatedAt,
    completedAt: input.evaluatedAt,
    evidence,
    evidenceHash: await canonicalSha256(evidence),
    decision: Object.freeze({
      action: actionForVerdict(input.verdict.code, input.verdict.reasons),
      reasonCodes: Object.freeze([...input.verdict.reasons]),
      verdict: input.verdict.code,
    }),
    execution: Object.freeze({
      transaction: "NOT_CREATED" as const,
      walletSignature: "NOT_REQUESTED" as const,
    }),
    payment: Object.freeze(
      input.trigger === "CLAWPUMP_X402"
        ? {
            provider: "CLAWPUMP_X402" as const,
            status: "EXTERNAL_GATEWAY_UNVERIFIED" as const,
          }
        : {
            provider: "NONE" as const,
            status: "NOT_APPLICABLE" as const,
          },
    ),
    nextRunAt,
  });
}
