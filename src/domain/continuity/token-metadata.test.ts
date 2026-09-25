import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtectedMarketMetadataUri,
  buildContTokenMetadata,
  CONT_TOKEN_NAME,
  CONT_TOKEN_SYMBOL,
  expandProtectedMarketMetadataKey,
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

test("uses the compact protected-market metadata route", () => {
  const draftId = "4f3eaa84-72d1-4bee-96a6-12b61bf8fe82";
  const uri = buildProtectedMarketMetadataUri(
    "https://continuity-alpha-rouge.vercel.app/app/launch?mode=mainnet",
    draftId,
  );

  assert.equal(
    uri,
    "https://continuity-alpha-rouge.vercel.app/m/Tz6qhHLRS-6WphK2G_j-gg",
  );
  assert.ok(uri.length <= 66, "Metadata URI must stay within the launch size budget");
  assert.equal(
    expandProtectedMarketMetadataKey("Tz6qhHLRS-6WphK2G_j-gg"),
    draftId,
  );
});
