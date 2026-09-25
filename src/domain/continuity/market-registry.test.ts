import assert from "node:assert/strict";
import test from "node:test";
import { prestocksCatalogFixture } from "./market-registry-fixture.ts";
import { buildPublicMarketRegistry } from "./market-registry.ts";

test("classifies the complete catalog without inventing lifecycle events", () => {
  const registry = buildPublicMarketRegistry({
    assets: prestocksCatalogFixture,
    catalogSha256: "a".repeat(64),
    mode: "LIVE_PRESTOCKS_API",
    observedAt: "2026-09-24T16:00:00.000Z",
    sourceUrl: "https://prestocks.com/api/prestocks",
  });

  assert.equal(registry.assets.length, 8);
  assert.equal(registry.summary.current, 7);
  assert.equal(registry.summary.actionRequired, 1);
  assert.equal(
    registry.assets.find((asset) => asset.symbol === "SPACEX")?.lifecycle.state,
    "ACTION_REQUIRED",
  );
  assert.ok(
    registry.assets
      .filter((asset) => asset.symbol !== "SPACEX")
      .every((asset) => asset.lifecycle.state === "CURRENT"),
  );
});

test("retains verified and unresolved historical instruments outside the live catalog", () => {
  const registry = buildPublicMarketRegistry({
    assets: prestocksCatalogFixture,
    catalogSha256: "a".repeat(64),
    mode: "DETERMINISTIC_REPLAY",
    observedAt: "2026-09-24T16:00:00.000Z",
    sourceUrl: "https://prestocks.com/api/prestocks",
  });

  assert.equal(registry.archive.length, 6);
  assert.equal(registry.archive[0]?.symbol, "XAI");
  assert.equal(registry.archive[0]?.fixedRatio, "0.7165");
  assert.equal(registry.archive[0]?.lifecycle.state, "EXPIRED");
  assert.equal(registry.assets.some((asset) => asset.symbol === "XAI"), false);
  assert.equal(registry.summary.universe, 14);
  assert.equal(registry.summary.historicalWatchlist, 5);
  assert.equal(
    registry.archive.find((asset) => asset.symbol === "KRAKEN")?.lifecycle.state,
    "SOURCE_REMOVED",
  );
  assert.equal(
    registry.archive.find((asset) => asset.symbol === "KRAKEN")?.successorSymbol,
    null,
  );
});
