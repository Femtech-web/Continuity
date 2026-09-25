import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSentinelRunDocument,
  monitoringIntervalSeconds,
} from "./sentinel-run.ts";

const evaluatedAt = "2026-09-24T14:00:00.000Z";
const deadlineAt = "2027-03-12T23:59:00.000Z";

test("uses daily monitoring while a lifecycle deadline is more than 30 days away", () => {
  assert.equal(
    monitoringIntervalSeconds({ deadlineAt, evaluatedAt, verdict: "LAUNCH_SAFE" }),
    86_400,
  );
});

test("tightens monitoring as the issuer deadline approaches", () => {
  assert.equal(
    monitoringIntervalSeconds({
      deadlineAt: "2026-09-24T20:00:00.000Z",
      evaluatedAt,
      verdict: "MANUAL_REVIEW",
    }),
    600,
  );
});

test("builds a non-executing, hash-addressable Sentinel run", async () => {
  const run = await buildSentinelRunDocument({
    attestation: {
      configurationHash: "f".repeat(64),
      hash: "a".repeat(64),
      slot: 450_049_775,
      state: "QUOTE_READY",
    },
    evaluatedAt,
    idempotencyKey: "scan-001",
    manifest: {
      deadlineAt,
      hash: "b".repeat(64),
      id: "prestocks-spacex-ipo-2026",
      reviewStatus: "UNREVIEWED",
      snapshotHash: "c".repeat(64),
      version: 1,
    },
    marketReference: {
      hash: "d".repeat(64),
      observedAt: evaluatedAt,
      status: "FRESH",
    },
    runId: "run-001",
    trigger: "CLAWPUMP_X402",
    verdict: {
      code: "MANUAL_REVIEW",
      reasons: ["LIFECYCLE_REVIEW_REQUIRED"],
    },
  });

  assert.equal(run.decision.action, "REVIEW_MANIFEST");
  assert.equal(run.execution.transaction, "NOT_CREATED");
  assert.equal(run.execution.walletSignature, "NOT_REQUESTED");
  assert.equal(run.payment.provider, "CLAWPUMP_X402");
  assert.equal(run.payment.status, "EXTERNAL_GATEWAY_UNVERIFIED");
  assert.match(run.evidenceHash, /^[a-f0-9]{64}$/);
  assert.equal(run.nextRunAt, "2026-09-25T14:00:00.000Z");
});
