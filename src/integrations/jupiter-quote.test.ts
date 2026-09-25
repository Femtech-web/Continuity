import assert from "node:assert/strict";
import test from "node:test";
import { SPCXX_MINT } from "./meteora-dbc.ts";
import { JupiterQuoteAdapter, USDC_MINT, WRAPPED_SOL_MINT } from "./jupiter-quote.ts";

function quotePayload(outputMint: string) {
  return {
    contextSlot: 450040662,
    inAmount: "100000000",
    inputMint: SPCXX_MINT,
    outAmount: outputMint === USDC_MINT ? "148480609" : "1296610846",
    outputMint,
    routePlan: [{
      swapInfo: {
        ammKey: "pool111111111111111111111111111111111111111",
        inputMint: SPCXX_MINT,
        label: "Raydium CLMM",
        outputMint,
      },
    }],
  };
}

test("fetches exact-size executable USDC and SOL routes", async () => {
  const requested: URL[] = [];
  const adapter = new JupiterQuoteAdapter({
    apiKey: null,
    baseUrl: "https://lite-api.jup.ag",
    fetchImplementation: async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requested.push(url);
      return Response.json(quotePayload(url.searchParams.get("outputMint") ?? ""));
    },
    now: () => new Date("2026-09-24T14:40:41.000Z"),
  });

  const observation = await adapter.getSpcxxReferenceQuotes();
  assert.equal(requested.length, 2);
  assert.ok(requested.every((url) => url.searchParams.get("amount") === "100000000"));
  assert.ok(requested.every((url) => url.searchParams.get("onlyDirectRoutes") === "true"));
  assert.equal(observation.usdQuote.outputMint, USDC_MINT);
  assert.equal(observation.solQuote.outputMint, WRAPPED_SOL_MINT);
  assert.equal(observation.provenance.authenticated, false);
});

test("rejects a quote whose exact input size was changed", async () => {
  const adapter = new JupiterQuoteAdapter({
    apiKey: null,
    baseUrl: "https://lite-api.jup.ag",
    fetchImplementation: async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      return Response.json({
        ...quotePayload(url.searchParams.get("outputMint") ?? ""),
        inAmount: "99999999",
      });
    },
  });
  await assert.rejects(
    () => adapter.getSpcxxReferenceQuotes(),
    /unexpected assets or size/,
  );
});

test("rejects a route that inserts an intermediate asset", async () => {
  const adapter = new JupiterQuoteAdapter({
    apiKey: null,
    baseUrl: "https://lite-api.jup.ag",
    fetchImplementation: async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      const outputMint = url.searchParams.get("outputMint") ?? "";
      return Response.json({
        ...quotePayload(outputMint),
        routePlan: [{ swapInfo: {
          ammKey: "pool111111111111111111111111111111111111111",
          inputMint: SPCXX_MINT,
          label: "Unexpected router",
          outputMint: "intermediate1111111111111111111111111111111",
        }}],
      });
    },
  });
  await assert.rejects(
    () => adapter.getSpcxxReferenceQuotes(),
    /intermediate asset/,
  );
});
