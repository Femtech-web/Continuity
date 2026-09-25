import { randomUUID } from "node:crypto";
import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import type { CompositeMarketReference } from "../domain/continuity/composite-market-reference.ts";
import {
  evaluateQuoteRail,
  type QuoteRailEvaluationInput,
} from "../domain/continuity/quote-rail.ts";
import {
  buildSentinelRunDocument,
  type SentinelMarketReferenceEvidence,
  type SentinelRunTrigger,
} from "../domain/continuity/sentinel-run.ts";
import type { CompositeMarketReferenceAdapter } from "../integrations/composite-market-reference.ts";
import type { MeteoraDbcAdapter, MeteoraDbcObservation } from "../integrations/meteora-dbc.ts";
import { SPCXX_MINT } from "../integrations/meteora-dbc.ts";
import { buildContSpcxxLaunchReview } from "../integrations/meteora-launch-config.ts";
import type { PreStocksAdapter, PreStocksEvidenceBundle } from "../integrations/prestocks.ts";
import type {
  AgentRunStore,
  PersistedAgentRun,
} from "../persistence/agent-run-store.ts";

interface SentinelRunnerOptions {
  readonly dbc: Pick<MeteoraDbcAdapter, "attestSpcxxQuoteRail">;
  readonly evidence: Pick<PreStocksAdapter, "captureSpaceXEvidence">;
  readonly marketReference: Pick<
    CompositeMarketReferenceAdapter,
    "getSpcxxUsdReference"
  >;
  readonly now?: () => Date;
  readonly runId?: () => string;
  readonly store: AgentRunStore;
}

export interface SentinelRunRequest {
  readonly idempotencyKey: string;
  readonly trigger: SentinelRunTrigger;
}

export interface SentinelRunResult {
  readonly record: PersistedAgentRun;
  readonly reused: boolean;
}

function passed(
  observation: MeteoraDbcObservation,
  key: MeteoraDbcObservation["attestation"]["checks"][number]["key"],
): boolean {
  return observation.attestation.checks.some(
    (check) => check.key === key && check.state === "PASS",
  );
}

function evidenceStatus(
  evidence: PreStocksEvidenceBundle,
): QuoteRailEvaluationInput["manifest"]["evidenceStatus"] {
  if (
    evidence.manifest.status === "ACTIVE" ||
    evidence.manifest.status === "REVIEWED"
  ) {
    return "VERIFIED";
  }
  if (evidence.manifest.status === "DRAFT") return "UNREVIEWED";
  return "CONFLICTED";
}

function referenceStatus(
  reference: CompositeMarketReference,
): SentinelMarketReferenceEvidence["status"] {
  if (reference.evaluation.verdict === "READY") return "FRESH";
  if (reference.evaluation.verdict === "STALE") return "STALE";
  return "MISSING";
}

function marketState(
  observation: MeteoraDbcObservation,
): QuoteRailEvaluationInput["market"]["state"] {
  if (observation.market === null) return "PROPOSED";
  return observation.market.isMigrated ? "MIGRATED" : "ACTIVE";
}

/**
 * One deterministic orchestration boundary for scheduled, on-demand, and
 * ClawPump x402 scans. It never builds, signs, or submits a transaction.
 */
export class SentinelRunner {
  readonly #dbc: SentinelRunnerOptions["dbc"];
  readonly #evidence: SentinelRunnerOptions["evidence"];
  readonly #marketReference: SentinelRunnerOptions["marketReference"];
  readonly #now: () => Date;
  readonly #runId: () => string;
  readonly #store: AgentRunStore;

  constructor(options: SentinelRunnerOptions) {
    this.#dbc = options.dbc;
    this.#evidence = options.evidence;
    this.#marketReference = options.marketReference;
    this.#now = options.now ?? (() => new Date());
    this.#runId = options.runId ?? (() => randomUUID());
    this.#store = options.store;
  }

  async run(request: SentinelRunRequest): Promise<SentinelRunResult> {
    if (!request.idempotencyKey.trim() || request.idempotencyKey.length > 160) {
      throw new TypeError("idempotencyKey must contain 1 to 160 characters");
    }

    const persisted = await this.#store.findByIdempotencyKey(
      request.idempotencyKey,
    );
    if (persisted) return Object.freeze({ record: persisted, reused: true });

    const evaluatedAt = this.#now().toISOString();
    if (request.trigger === "SCHEDULED") {
      const latestScheduled = (await this.#store.list(20)).find(
        (record) => record.document.trigger === "SCHEDULED",
      );
      if (
        latestScheduled &&
        Date.parse(latestScheduled.document.nextRunAt) > Date.parse(evaluatedAt)
      ) {
        return Object.freeze({ record: latestScheduled, reused: true });
      }
    }

    const [evidence, dbc, reference] = await Promise.all([
      this.#evidence.captureSpaceXEvidence(),
      this.#dbc.attestSpcxxQuoteRail(),
      this.#marketReference.getSpcxxUsdReference(),
    ]);
    const launchReview = await buildContSpcxxLaunchReview({
      mode: "LIVE_COMPOSITE",
      observation: reference,
    });
    const state = marketState(dbc);
    const evaluation = evaluateQuoteRail({
      evaluatedAt,
      market: {
        state,
        baseMint: dbc.market?.baseMint ?? "CONT_MINT_PENDING_LAUNCH",
        quoteMint: dbc.addresses.quoteMint,
        expectedQuoteMint: SPCXX_MINT,
        // Proposed markets are bound to the freshly hashed SDK review. Existing
        // pools remain blocked until post-launch config decoding is implemented.
        configHashMatches: state === "PROPOSED",
      },
      quoteAsset: {
        symbol: "SPCXx",
        lifecycleStatus: "CURRENT",
        successorMint: null,
        successorSymbol: null,
        tokenProgramAllowed:
          passed(dbc, "quote-mint") && passed(dbc, "transfer-fee"),
        dbcBadgeVerified: passed(dbc, "badge"),
      },
      manifest: {
        id: evidence.manifest.manifestId,
        version: evidence.manifest.manifestVersion,
        hash: evidence.manifestSha256,
        evidenceStatus: evidenceStatus(evidence),
      },
      marketReference: {
        status: referenceStatus(reference),
        observedAt: reference.provenance.pyth.retrievedAt,
      },
    });
    const [attestationHash, referenceHash] = await Promise.all([
      canonicalSha256(dbc),
      canonicalSha256(reference),
    ]);
    const document = await buildSentinelRunDocument({
      attestation: {
        configurationHash: launchReview.configuration.hash,
        hash: attestationHash,
        slot: dbc.provenance.slot,
        state: dbc.attestation.state,
      },
      evaluatedAt,
      idempotencyKey: request.idempotencyKey,
      manifest: {
        deadlineAt: evidence.manifest.deadlineAt,
        hash: evidence.manifestSha256,
        id: evidence.manifest.manifestId,
        reviewStatus:
          evidenceStatus(evidence) === "VERIFIED" ? "REVIEWED" : "UNREVIEWED",
        snapshotHash: evidence.snapshot.snapshotSha256,
        version: evidence.manifest.manifestVersion,
      },
      marketReference: {
        hash: referenceHash,
        observedAt: reference.provenance.pyth.retrievedAt,
        status: referenceStatus(reference),
      },
      runId: this.#runId(),
      trigger: request.trigger,
      verdict: {
        code: evaluation.code,
        reasons: evaluation.reasons,
      },
    });
    const record = await this.#store.append(document);
    return Object.freeze({ record, reused: false });
  }
}
