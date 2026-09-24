import assert from "node:assert/strict";
import test from "node:test";
import { spaceXManifestDocument } from "./dashboard-fixture.ts";
import { validateActionManifest } from "./action-manifest.ts";

test("accepts the complete SpaceX lifecycle manifest contract", () => {
  const result = validateActionManifest(spaceXManifestDocument);
  assert.equal(result.success, true);
});

test("rejects a market swap that invents a fixed conversion ratio", () => {
  const result = validateActionManifest({
    ...spaceXManifestDocument,
    fixedRatio: { numerator: "1", denominator: "1" },
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path === "$.fixedRatio"));
  }
});

test("rejects an invalid successor mint and deadline order", () => {
  const result = validateActionManifest({
    ...spaceXManifestDocument,
    deadlineAt: "2026-01-01T00:00:00Z",
    targetInstrument: {
      ...spaceXManifestDocument.targetInstrument,
      mint: "not-a-mint",
    },
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path === "$.targetInstrument.mint"));
    assert.ok(result.issues.some((issue) => issue.path === "$.deadlineAt"));
  }
});

test("rejects placeholder evidence hashes on active manifests", () => {
  const result = validateActionManifest({
    ...spaceXManifestDocument,
    sources: [
      {
        ...spaceXManifestDocument.sources[0],
        contentSha256: "0".repeat(64),
      },
    ],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.issues.some(
        (issue) => issue.path === "$.sources[0].contentSha256",
      ),
    );
  }
});
