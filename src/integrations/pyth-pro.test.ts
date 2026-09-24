import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationError } from "./integration-error.ts";
import { PythProAdapter } from "./pyth-pro.ts";

function adapter(fetchImplementation?: typeof fetch, apiKey: string | null = "secret") {
  return new PythProAdapter({
    apiKey,
    baseUrl: "https://pyth.example",
    channel: "fixed_rate@200ms",
    feedId: 3329,
    fetchImplementation,
    now: () => new Date("2026-09-24T09:41:09.000Z"),
  });
}

test("parses the authenticated SPCXx/USD reference payload", async () => {
  const fakeFetch: typeof fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer secret");
    return new Response(
      JSON.stringify({
        parsed: {
          timestampUs: "1790242865100000",
          priceFeeds: [
            {
              confidence: "22000000",
              exponent: -8,
              feedUpdateTimestamp: "1790242865000000",
              marketSession: "regular",
              price: "23810000000",
              priceFeedId: 3329,
              publisherCount: 4,
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const observation = await adapter(fakeFetch).getSpcxxUsdReference();

  assert.equal(observation.snapshot.feedId, 3329);
  assert.equal(observation.snapshot.priceMantissa, "23810000000");
  assert.equal(observation.provenance.authenticated, true);
});

test("fails closed before making a request when the API key is absent", async () => {
  await assert.rejects(
    () => adapter(undefined, null).getSpcxxUsdReference(),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "AUTH_REQUIRED",
  );
});

test("classifies authentication rejection without exposing the key", async () => {
  const fakeFetch: typeof fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(
    () => adapter(fakeFetch).getSpcxxUsdReference(),
    (error: unknown) =>
      error instanceof IntegrationError &&
      error.code === "AUTH_REQUIRED" &&
      !error.message.includes("secret"),
  );
});
