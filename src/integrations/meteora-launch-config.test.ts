import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoLaunchReview } from "./meteora-launch-config.ts";

test("builds a deterministic unsigned stock-aware Meteora configuration", async () => {
  const first = await buildDemoLaunchReview();
  const second = await buildDemoLaunchReview();

  assert.equal(first.reviewState, "READY_FOR_REVIEW");
  assert.equal(first.signing.enabled, false);
  assert.equal(first.calibration.quoteBaseUnits, "419991601");
  assert.equal(
    first.configuration.sdk.migrationQuoteThreshold,
    first.calibration.quoteBaseUnits,
  );
  assert.equal(first.configuration.hash, second.configuration.hash);
  assert.equal(first.configuration.design.migration, "DAMM_V2");
  assert.equal(first.configuration.design.liquidityLock.creatorPermanentPercent, 50);
});
