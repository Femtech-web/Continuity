import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSha256 } from "./canonical-json.ts";
import type { GuardianEvaluation } from "./guardian.ts";
import { buildActionReceipt, type BuildReceiptInput } from "./receipt.ts";

const digest = "a".repeat(64);
const wallet = "4vJ8wB5v4oQX4m8PfMT7Y8HvLrKLrHjM3gE2rJqvP31";
const sourceMint = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const destinationMint = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";

const waitEvaluation: GuardianEvaluation = {
  decision: "WAIT",
  reasonCodes: ["REFERENCE_MARKET_CLOSED"],
  evaluatedAt: "2026-09-23T09:41:09Z",
  checks: [],
};

function createReceiptInput(
  overrides: Partial<BuildReceiptInput> = {},
): BuildReceiptInput {
  return {
    receiptId: "receipt-cn-0427-wait",
    cluster: "mainnet-beta",
    wallet,
    manifest: { id: "prestocks-spacex-ipo-2026", version: 1, sha256: digest },
    policy: { id: "wallet-policy-1", version: 1, sha256: digest },
    evaluation: waitEvaluation,
    observations: {
      sourceObservedAt: "2026-09-23T09:41:06Z",
      chainSlot: 369_200_100,
      quoteObservedAt: null,
      pyth: {
        feedId: "SPCXx-USD",
        updateTimestamp: "2026-09-23T09:41:09Z",
        session: "CLOSED",
        price: "0",
        confidence: "0",
      },
    },
    action: {
      sourceMint,
      destinationMint,
      inputBaseUnits: "38420000000",
      minimumOutputBaseUnits: "0",
      routeLabels: [],
      quoteId: null,
    },
    outcome: {
      status: "NOT_EXECUTED",
      signature: null,
      simulationError: null,
      reconciled: false,
      actualInputBaseUnits: null,
      actualOutputBaseUnits: null,
    },
    createdAt: "2026-09-23T09:41:09Z",
    ...overrides,
  };
}

test("builds and freezes a non-executed WAIT receipt", () => {
  const receipt = buildActionReceipt(createReceiptInput());
  assert.equal(receipt.decision.code, "WAIT");
  assert.equal(receipt.outcome.status, "NOT_EXECUTED");
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.action.routeLabels), true);
});

test("the same receipt input produces the same canonical hash", async () => {
  const left = await canonicalSha256(buildActionReceipt(createReceiptInput()));
  const right = await canonicalSha256(buildActionReceipt(createReceiptInput()));
  assert.equal(left, right);
});

test("WAIT can never claim a submitted transaction", () => {
  const base = createReceiptInput();
  assert.throws(
    () => buildActionReceipt({
      ...base,
      outcome: { ...base.outcome, status: "SUBMITTED", signature: "signature" },
    }),
    /WAIT cannot produce SUBMITTED/,
  );
});

test("a non-executed receipt cannot contain a signature", () => {
  const base = createReceiptInput();
  assert.throws(
    () => buildActionReceipt({
      ...base,
      outcome: { ...base.outcome, signature: "signature" },
    }),
    /cannot contain a transaction signature/,
  );
});
