import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateQuoteRail,
  type QuoteRailEvaluationInput,
} from "./quote-rail.ts";

const baseInput: QuoteRailEvaluationInput = {
  evaluatedAt: "2026-09-24T09:41:09Z",
  market: {
    state: "PROPOSED",
    baseMint: "CONT_MINT",
    quoteMint: "SPCXX_MINT",
    expectedQuoteMint: "SPCXX_MINT",
    configHashMatches: true,
  },
  quoteAsset: {
    symbol: "SPCXx",
    lifecycleStatus: "CURRENT",
    successorMint: null,
    successorSymbol: null,
    tokenProgramAllowed: true,
    dbcBadgeVerified: true,
  },
  manifest: {
    id: "prestocks-spacex-ipo-2026",
    version: 1,
    hash: "manifest-hash",
    evidenceStatus: "VERIFIED",
  },
  marketReference: {
    status: "FRESH",
    observedAt: "2026-09-24T09:41:05Z",
  },
};

test("marks a fully attested proposed quote rail safe to launch", () => {
  const result = evaluateQuoteRail(baseInput);
  assert.equal(result.code, "LAUNCH_SAFE");
  assert.deepEqual(result.reasons, ["ALL_CHECKS_PASS"]);
});

test("blocks a proposed market whose quote instrument is retiring", () => {
  const result = evaluateQuoteRail({
    ...baseInput,
    quoteAsset: {
      ...baseInput.quoteAsset,
      lifecycleStatus: "RETIRING",
      successorMint: "SPCXX_SUCCESSOR",
      successorSymbol: "SPCXx",
    },
  });
  assert.equal(result.code, "LAUNCH_BLOCKED");
  assert.equal(result.rolloverPlan, null);
});

test("requires rollover for an active market whose quote asset is retiring", () => {
  const result = evaluateQuoteRail({
    ...baseInput,
    market: { ...baseInput.market, state: "ACTIVE" },
    quoteAsset: {
      ...baseInput.quoteAsset,
      lifecycleStatus: "RETIRING",
      successorMint: "SPCXX_SUCCESSOR",
      successorSymbol: "SPCXx",
    },
  });
  assert.equal(result.code, "ROLLOVER_REQUIRED");
  assert.deepEqual(result.rolloverPlan, {
    fromQuoteMint: "SPCXX_MINT",
    toQuoteMint: "SPCXX_SUCCESSOR",
    toQuoteSymbol: "SPCXx",
    action: "PREPARE_SUCCESSOR_DBC",
    existingConfigMutable: false,
  });
});

test("blocks missing source evidence even when onchain checks pass", () => {
  const result = evaluateQuoteRail({
    ...baseInput,
    manifest: { ...baseInput.manifest, evidenceStatus: "MISSING" },
  });
  assert.equal(result.code, "LAUNCH_BLOCKED");
  assert.ok(result.reasons.includes("LIFECYCLE_EVIDENCE_MISSING"));
});

test("sends stale market reference data to manual review", () => {
  const result = evaluateQuoteRail({
    ...baseInput,
    marketReference: { status: "STALE", observedAt: "2026-09-24T09:35:00Z" },
  });
  assert.equal(result.code, "MANUAL_REVIEW");
  assert.ok(result.reasons.includes("MARKET_REFERENCE_STALE"));
});

test("blocks an observed configuration hash mismatch", () => {
  const result = evaluateQuoteRail({
    ...baseInput,
    market: { ...baseInput.market, configHashMatches: false },
  });
  assert.equal(result.code, "LAUNCH_BLOCKED");
  assert.ok(result.reasons.includes("CONFIG_HASH_MISMATCH"));
});
