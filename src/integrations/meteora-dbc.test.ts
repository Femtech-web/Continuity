import assert from "node:assert/strict";
import test from "node:test";
import { isDynamicFeeEnabled } from "./meteora-dbc.ts";

test("detects the numeric binStep returned by the live Meteora SDK", () => {
  assert.equal(isDynamicFeeEnabled(1), true);
  assert.equal(isDynamicFeeEnabled(0), false);
});

test("supports BN-shaped SDK values without assuming one runtime decoder", () => {
  assert.equal(isDynamicFeeEnabled({ isZero: () => false }), true);
  assert.equal(isDynamicFeeEnabled({ isZero: () => true }), false);
});
