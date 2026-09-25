import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { SentinelRunDocument } from "../domain/continuity/sentinel-run.ts";
import { FileAgentRunStore } from "./agent-run-store.ts";

function run(id: string, key: string): SentinelRunDocument {
  return {
    schemaVersion: "1.0.0",
    runId: id,
    idempotencyKey: key,
    subject: { baseSymbol: "CONT", market: "CONT/SPCXx", quoteSymbol: "SPCXx" },
    trigger: "ON_DEMAND",
    evaluatedAt: "2026-09-24T14:00:00.000Z",
    completedAt: "2026-09-24T14:00:00.000Z",
    evidence: {
      manifest: {
        deadlineAt: "2027-03-12T23:59:00.000Z",
        hash: "a".repeat(64),
        id: "prestocks-spacex-ipo-2026",
        reviewStatus: "UNREVIEWED",
        snapshotHash: "b".repeat(64),
        version: 1,
      },
      marketReference: {
        hash: "c".repeat(64),
        observedAt: "2026-09-24T14:00:00.000Z",
        status: "FRESH",
      },
      meteora: {
        configurationHash: "f".repeat(64),
        hash: "d".repeat(64),
        slot: 450_049_775,
        state: "QUOTE_READY",
      },
    },
    evidenceHash: "e".repeat(64),
    decision: {
      action: "REVIEW_MANIFEST",
      reasonCodes: ["LIFECYCLE_REVIEW_REQUIRED"],
      verdict: "MANUAL_REVIEW",
    },
    execution: { transaction: "NOT_CREATED", walletSignature: "NOT_REQUESTED" },
    payment: { provider: "NONE", status: "NOT_APPLICABLE" },
    nextRunAt: "2026-09-25T14:00:00.000Z",
  };
}

test("appends hash-chained runs and reuses an idempotent result", async () => {
  const directory = await mkdtemp(join(tmpdir(), "continuity-runs-"));
  const filePath = join(directory, "runs.jsonl");
  try {
    const store = new FileAgentRunStore(filePath);
    const first = await store.append(run("run-1", "key-1"));
    const duplicate = await store.append(run("run-duplicate", "key-1"));
    const second = await store.append(run("run-2", "key-2"));

    assert.equal(duplicate.document.runId, "run-1");
    assert.equal(second.integrity.previousRecordHash, first.integrity.recordHash);
    assert.equal((await store.list(10)).length, 2);
    assert.equal((await readFile(filePath, "utf8")).trim().split("\n").length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("refuses a broken append-only hash chain", async () => {
  const directory = await mkdtemp(join(tmpdir(), "continuity-runs-"));
  const filePath = join(directory, "runs.jsonl");
  try {
    const store = new FileAgentRunStore(filePath);
    await store.append(run("run-1", "key-1"));
    const contents = await readFile(filePath, "utf8");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(filePath, contents.replace("run-1", "run-tampered")),
    );

    await assert.rejects(() => store.list(10), /integrity check failed/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
