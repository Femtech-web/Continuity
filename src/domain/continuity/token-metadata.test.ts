import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContTokenMetadata,
  CONT_TOKEN_NAME,
  CONT_TOKEN_SYMBOL,
} from "./token-metadata.ts";

test("builds deployment-aware CONT metadata", () => {
  const metadata = buildContTokenMetadata(
    "https://continuity.example/token/cont.json?cache=miss",
  );

  assert.equal(metadata.name, CONT_TOKEN_NAME);
  assert.equal(metadata.symbol, CONT_TOKEN_SYMBOL);
  assert.equal(metadata.image, "https://continuity.example/token/cont.png");
  assert.equal(metadata.external_url, "https://continuity.example/");
  assert.deepEqual(metadata.properties.files, [
    {
      uri: "https://continuity.example/token/cont.png",
      type: "image/png",
    },
  ]);
});
