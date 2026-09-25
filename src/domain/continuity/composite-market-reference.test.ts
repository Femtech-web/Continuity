import assert from "node:assert/strict";
import test from "node:test";
import { buildCompositeMarketReference } from "./composite-market-reference.ts";

const evaluatedAt = "2026-09-24T14:40:42.000Z";

function fixture(solOutput = "1296610846", usdOutput = "148480609") {
  return buildCompositeMarketReference({
    evaluatedAt,
    jupiter: {
      provenance: {
        authenticated: false,
        endpointHost: "lite-api.jup.ag",
        retrievedAt: "2026-09-24T14:40:41.000Z",
        source: "JUPITER_SWAP_QUOTE",
      },
      solQuote: {
        contextSlot: 450040662,
        inputAmount: "100000000",
        inputMint: "SPCXX",
        outputAmount: solOutput,
        outputMint: "SOL",
        retrievedAt: "2026-09-24T14:40:41.000Z",
        route: [],
      },
      usdQuote: {
        contextSlot: 450040662,
        inputAmount: "100000000",
        inputMint: "SPCXX",
        outputAmount: usdOutput,
        outputMint: "USDC",
        retrievedAt: "2026-09-24T14:40:41.000Z",
        route: [],
      },
    },
    pyth: {
      provenance: {
        authenticated: true,
        channel: "fixed_rate@200ms",
        endpointHost: "pyth-lazer.dourolabs.app",
        retrievedAt: evaluatedAt,
        source: "PYTH_PRO_REST",
      },
      snapshot: {
        confidenceMantissa: "1241425",
        exponent: -8,
        feedId: 6,
        feedUpdatedAt: "2026-09-24T14:40:40.400Z",
        marketSession: "regular",
        payloadTimestamp: "2026-09-24T14:40:40.400Z",
        priceMantissa: "11472758575",
        publisherCount: 18,
        symbol: "Crypto.SOL/USD",
      },
    },
  });
}

test("selects the conservative lower executable-derived price", () => {
  const reference = fixture();
  assert.equal(reference.snapshot.selectedPrice.source, "JUPITER_USDC_EXECUTABLE");
  assert.equal(reference.snapshot.selectedPrice.priceMantissa, "148480609");
  assert.equal(reference.snapshot.selectedPrice.exponent, -6);
  assert.equal(reference.evaluation.deviationBps, 19);
  assert.equal(reference.evaluation.verdict, "READY");
});

test("blocks routes whose two independently derived prices diverge", () => {
  const reference = fixture("1000000000");
  assert.equal(reference.evaluation.verdict, "BLOCKED");
  assert.equal(reference.evaluation.checks.at(-1)?.state, "FAIL");
});

test("marks expired executable quotes stale", () => {
  const reference = buildCompositeMarketReference({
    ...(() => {
      const current = fixture();
      return {
        jupiter: {
          provenance: current.provenance.jupiter,
          solQuote: current.snapshot.solQuote,
          usdQuote: current.snapshot.usdQuote,
        },
        pyth: {
          provenance: current.provenance.pyth,
          snapshot: current.snapshot.pythSolUsd,
        },
      };
    })(),
    evaluatedAt: "2026-09-24T14:42:42.000Z",
  });
  assert.equal(reference.evaluation.verdict, "STALE");
});
