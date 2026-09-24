import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, canonicalSha256 } from "./canonical-json.ts";

test("canonical JSON recursively sorts object keys", () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: true, b: [3, { d: 4, c: 2 }] } }),
    '{"a":{"b":[3,{"c":2,"d":4}],"y":true},"z":1}',
  );
});

test("canonical SHA-256 is stable across input key order", async () => {
  const left = await canonicalSha256({ mint: "SPACEX", amount: "3842" });
  const right = await canonicalSha256({ amount: "3842", mint: "SPACEX" });

  assert.equal(left, right);
  assert.match(left, /^[a-f0-9]{64}$/);
});

test("canonical JSON rejects values that JSON would silently discard", () => {
  assert.throws(() => canonicalJson({ unsafe: undefined }), /cannot be undefined/);
});
