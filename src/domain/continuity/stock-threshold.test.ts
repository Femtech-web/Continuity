import assert from "node:assert/strict";
import test from "node:test";
import {
  calibrateStockThreshold,
  evaluateStockReference,
  formatMantissa,
  type StockReferenceSnapshot,
} from "./stock-threshold.ts";

const snapshot = {
  confidenceMantissa: "22000000",
  exponent: -8,
  feedId: 3329,
  feedUpdatedAt: "2026-09-24T09:41:05.000Z",
  marketSession: "regular",
  payloadTimestamp: "2026-09-24T09:41:05.100Z",
  priceMantissa: "23810000000",
  publisherCount: 4,
  symbol: "Crypto.SPCXX/USD",
} as const satisfies StockReferenceSnapshot;

test("normalizes Pyth mantissas without floating-point arithmetic", () => {
  assert.equal(formatMantissa("23810000000", -8), "238.1");
  assert.equal(formatMantissa("42", 2), "4200");
});

test("rounds the stock-denominated graduation threshold up in base units", () => {
  const calibration = calibrateStockThreshold(snapshot, {
    quoteDecimals: 8,
    targetUsd: 1_000,
  });

  assert.equal(calibration.quoteBaseUnits, "419991601");
  assert.equal(calibration.quoteAmount, "4.19991601");
});

test("accepts a fresh, sufficiently published low-confidence reference", () => {
  const result = evaluateStockReference(
    snapshot,
    {
      expectedFeedId: 3329,
      expectedSymbol: "Crypto.SPCXX/USD",
      maxAgeSeconds: 60,
      maxConfidenceBps: 100,
      minPublishers: 3,
    },
    "2026-09-24T09:41:09.000Z",
  );

  assert.equal(result.verdict, "READY");
  assert.equal(result.confidenceBps, 10);
});

test("fails closed when a carried-forward reference is stale", () => {
  const result = evaluateStockReference(
    snapshot,
    {
      expectedFeedId: 3329,
      expectedSymbol: "Crypto.SPCXX/USD",
      maxAgeSeconds: 3,
      maxConfidenceBps: 100,
      minPublishers: 3,
    },
    "2026-09-24T09:41:09.000Z",
  );

  assert.equal(result.verdict, "STALE");
});
