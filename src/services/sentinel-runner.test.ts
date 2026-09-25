import assert from "node:assert/strict";
import test from "node:test";
import type { CompositeMarketReference } from "../domain/continuity/composite-market-reference.ts";
import type { SentinelRunDocument } from "../domain/continuity/sentinel-run.ts";
import type { MeteoraDbcObservation } from "../integrations/meteora-dbc.ts";
import type { PreStocksEvidenceBundle } from "../integrations/prestocks.ts";
import type {
  AgentRunStore,
  PersistedAgentRun,
} from "../persistence/agent-run-store.ts";
import { SentinelRunner } from "./sentinel-runner.ts";

class MemoryStore implements AgentRunStore {
  records: PersistedAgentRun[] = [];

  async append(document: SentinelRunDocument) {
    const duplicate = await this.findByIdempotencyKey(document.idempotencyKey);
    if (duplicate) return duplicate;
    const record = {
      document,
      integrity: {
        previousRecordHash: this.records.at(-1)?.integrity.recordHash ?? null,
        recordHash: `${this.records.length + 1}`.padStart(64, "0"),
      },
    } satisfies PersistedAgentRun;
    this.records.push(record);
    return record;
  }

  async findByIdempotencyKey(key: string) {
    return this.records.find((record) => record.document.idempotencyKey === key) ?? null;
  }

  async list(limit: number) {
    return this.records.slice(-limit).reverse();
  }
}

const evidence = {
  manifest: {
    manifestId: "prestocks-spacex-ipo-2026",
    manifestVersion: 1,
    status: "DRAFT",
    deadlineAt: "2027-03-12T23:59:00.000Z",
    targetInstrument: { mint: "SPCXX", symbol: "SPCXx" },
  },
  manifestSha256: "a".repeat(64),
  snapshot: { snapshotSha256: "b".repeat(64) },
} as unknown as PreStocksEvidenceBundle;

const dbc = {
  addresses: { quoteMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8" },
  attestation: {
    state: "QUOTE_READY",
    checks: [
      { key: "quote-mint", state: "PASS" },
      { key: "badge", state: "PASS" },
      { key: "transfer-fee", state: "PASS" },
      { key: "config", state: "PENDING" },
      { key: "pool", state: "PENDING" },
    ],
  },
  market: null,
  provenance: { slot: 450_049_775 },
} as unknown as MeteoraDbcObservation;

const reference = {
  evaluation: { verdict: "READY" },
  provenance: { pyth: { retrievedAt: "2026-09-24T14:00:00.000Z" } },
  snapshot: {
    selectedPrice: { exponent: -5, priceMantissa: "14692734" },
  },
} as unknown as CompositeMarketReference;

test("persists an unreviewed live manifest as manual review without creating a transaction", async () => {
  const store = new MemoryStore();
  const runner = new SentinelRunner({
    dbc: { attestSpcxxQuoteRail: async () => dbc },
    evidence: { captureSpaceXEvidence: async () => evidence },
    marketReference: { getSpcxxUsdReference: async () => reference },
    now: () => new Date("2026-09-24T14:00:00.000Z"),
    runId: () => "run-live-1",
    store,
  });

  const result = await runner.run({
    idempotencyKey: "request-1",
    trigger: "SCHEDULED",
  });

  assert.equal(result.reused, false);
  assert.equal(result.record.document.decision.verdict, "MANUAL_REVIEW");
  assert.equal(result.record.document.decision.action, "REVIEW_MANIFEST");
  assert.equal(result.record.document.execution.transaction, "NOT_CREATED");
  assert.equal(store.records.length, 1);
});

test("returns the persisted run before touching live integrations on an idempotent retry", async () => {
  const store = new MemoryStore();
  let calls = 0;
  const runner = new SentinelRunner({
    dbc: { attestSpcxxQuoteRail: async () => { calls += 1; return dbc; } },
    evidence: { captureSpaceXEvidence: async () => { calls += 1; return evidence; } },
    marketReference: { getSpcxxUsdReference: async () => { calls += 1; return reference; } },
    now: () => new Date("2026-09-24T14:00:00.000Z"),
    runId: () => "run-live-1",
    store,
  });

  await runner.run({ idempotencyKey: "request-1", trigger: "ON_DEMAND" });
  const repeated = await runner.run({
    idempotencyKey: "request-1",
    trigger: "ON_DEMAND",
  });

  assert.equal(repeated.reused, true);
  assert.equal(calls, 3);
});
