import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSha256 } from "./canonical-json.ts";
import { spcxxMint } from "./quote-rail-fixture.ts";
import { buildQuoteRailReplayReceipt } from "./quote-rail-receipt.ts";

test("builds a stable non-submitted rollover receipt", async () => {
  const first = await buildQuoteRailReplayReceipt();
  const second = await buildQuoteRailReplayReceipt();

  assert.deepEqual(first, second);
  assert.equal(first.document.verdict, "ROLLOVER_REQUIRED");
  assert.equal(first.document.outcome, "NOT_SUBMITTED");
  assert.equal(first.document.existingConfigMutable, false);
  assert.equal(first.document.successorQuoteMint, spcxxMint);
  assert.equal(first.digest, await canonicalSha256(first.document));
  assert.match(first.digest, /^[a-f0-9]{64}$/);
});
