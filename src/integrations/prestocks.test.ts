import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationError } from "./integration-error.ts";
import { PreStocksAdapter } from "./prestocks.ts";

const sourceMint = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const successorMint = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const catalogUrl = "https://prestocks.test/api/prestocks";
const pageUrl = "https://prestocks.test/spacex";

const catalog = JSON.stringify([
  {
    name: "SpaceX PreStocks",
    symbol: "SPACEX",
    description: "SpaceX economic exposure.",
    external_url: pageUrl,
    contract_address: sourceMint,
  },
]);

const lifecyclePage = `
  <html><body>
    <p>SpaceX has gone public!</p>
    <span>SpaceX PreStocks tokens must be swapped into
      <a href="https://solscan.io/token/${successorMint}">$SPCXx</a>
      or any other token before 11:59pm UTC on 12 March 2027,
      or they will expire worthless.
    </span>
  </body></html>
`;

function createAdapter(page = lifecyclePage) {
  return new PreStocksAdapter({
    catalogUrl,
    pageUrl,
    now: () => new Date("2026-09-24T13:15:00Z"),
    fetchImplementation: async (input) => {
      const url = String(input);
      if (url === catalogUrl) return new Response(catalog, { status: 200 });
      if (url === pageUrl) return new Response(page, { status: 200 });
      return new Response("not found", { status: 404 });
    },
  });
}

test("captures the live-shaped SpaceX notice into a valid draft manifest", async () => {
  const evidence = await createAdapter().captureSpaceXEvidence();

  assert.equal(evidence.snapshot.sourceInstrument.mint, sourceMint);
  assert.equal(evidence.snapshot.lifecycleNotice.successorMint, successorMint);
  assert.equal(evidence.snapshot.lifecycleNotice.deadlineAt, "2027-03-12T23:59:00Z");
  assert.equal(evidence.manifest.status, "DRAFT");
  assert.equal(evidence.manifest.fixedRatio, null);
  assert.equal(evidence.manifest.review.reviewedBy, "PENDING_HUMAN_REVIEW");
  assert.equal(evidence.validation.status, "PASSED");
  assert.match(evidence.snapshot.sourceContentSha256, /^[a-f0-9]{64}$/);
  assert.match(evidence.manifestSha256, /^[a-f0-9]{64}$/);
});

test("refuses a page that no longer exposes the successor fact", async () => {
  await assert.rejects(
    createAdapter("<html><body>SpaceX page without a notice.</body></html>")
      .captureSpaceXEvidence(),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "INVALID_RESPONSE",
  );
});

test("refuses an unreviewed successor mint even when the page shape is valid", async () => {
  const unexpectedMint = "So11111111111111111111111111111111111111112";
  await assert.rejects(
    createAdapter(lifecyclePage.replace(successorMint, unexpectedMint))
      .captureSpaceXEvidence(),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "INVALID_RESPONSE",
  );
});

test("classifies an absent catalogue instrument as unsupported", async () => {
  const adapter = new PreStocksAdapter({
    catalogUrl,
    pageUrl,
    fetchImplementation: async (input) =>
      String(input) === catalogUrl
        ? new Response("[]", { status: 200 })
        : new Response(lifecyclePage, { status: 200 }),
  });

  await assert.rejects(
    adapter.captureSpaceXEvidence(),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "UNSUPPORTED_ASSET",
  );
});
