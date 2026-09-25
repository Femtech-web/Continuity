import assert from "node:assert/strict";
import test from "node:test";
import { restoreLaunchProgress } from "./launch-progress.ts";

test("a confirmed draft with a registered market restores the completed launch", () => {
  assert.deepEqual(
    restoreLaunchProgress({
      draftId: "draft-1",
      draftStatus: "CONFIRMED",
      market: { draftId: "draft-1", id: "market-1" },
    }),
    {
      phase: "launched",
      preflightPassed: false,
      step: 4,
    },
  );
});

test("a stored preflight must be rerun with a fresh blockhash after refresh", () => {
  assert.deepEqual(
    restoreLaunchProgress({
      draftId: "draft-1",
      draftStatus: "PREFLIGHT_READY",
      market: null,
    }),
    {
      phase: "preflight-required",
      preflightPassed: false,
      step: 3,
    },
  );
});

test("an ordinary draft resumes at the first product decision", () => {
  assert.deepEqual(
    restoreLaunchProgress({
      draftId: "draft-1",
      draftStatus: "DRAFT",
      market: null,
    }),
    {
      phase: "draft",
      preflightPassed: false,
      step: 0,
    },
  );
});

test("a confirmation without a registered market remains in reconciliation", () => {
  assert.deepEqual(
    restoreLaunchProgress({
      draftId: "draft-1",
      draftStatus: "CONFIRMED",
      market: null,
    }),
    {
      phase: "reconciling",
      preflightPassed: false,
      step: 4,
    },
  );
});
