import assert from "node:assert/strict";
import test from "node:test";
import { prestocksCatalogFixture } from "../domain/continuity/market-registry-fixture.ts";
import { scanPublicMarketRegistry } from "./market-registry-service.ts";

test("builds a fourteen-instrument universe from the live catalog and lifecycle archive", async () => {
  const registry = await scanPublicMarketRegistry({
    captureCatalog: async () => ({
      assets: prestocksCatalogFixture,
      observedAt: "2026-09-24T16:00:00.000Z",
      publisher: "PreStocks",
      snapshotSha256: "b".repeat(64),
      sourceContentSha256: "a".repeat(64),
      sourceUrl: "https://prestocks.com/api/prestocks",
    }),
  });

  assert.equal(registry.assets.length, 8);
  assert.equal(registry.archive.length, 6);
  assert.equal(registry.summary.universe, 14);
  assert.equal(registry.mode, "LIVE_PRESTOCKS_API");
});

