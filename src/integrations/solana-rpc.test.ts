import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationError } from "./integration-error.ts";
import { SolanaRpcAdapter } from "./solana-rpc.ts";

const spacexMint = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const token2022Program = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("returns a typed mint observation with redacted RPC provenance", async () => {
  const adapter = new SolanaRpcAdapter({
    cluster: "mainnet-beta",
    rpcUrl: "https://rpc.example/path?api-key=secret",
    now: () => new Date("2026-09-24T12:00:00Z"),
    fetchImplementation: async () =>
      jsonResponse({
        jsonrpc: "2.0",
        result: {
          context: { slot: 371_000_001 },
          value: {
            data: {
              parsed: {
                type: "mint",
                info: {
                  decimals: 9,
                  freezeAuthority: null,
                  isInitialized: true,
                  mintAuthority: null,
                  supply: "1000000000000",
                  extensions: [{ extension: "metadataPointer" }],
                },
              },
              program: "spl-token-2022",
              space: 234,
            },
            executable: false,
            lamports: 2_500_000,
            owner: token2022Program,
            space: 234,
          },
        },
      }),
  });

  const observation = await adapter.getMint(spacexMint);

  assert.equal(observation.instrument.mint, spacexMint);
  assert.equal(observation.instrument.tokenProgram, token2022Program);
  assert.equal(observation.instrument.decimals, 9);
  assert.deepEqual(observation.instrument.extensions, ["metadataPointer"]);
  assert.equal(observation.provenance.slot, 371_000_001);
  assert.equal(observation.provenance.endpointHost, "rpc.example");
  assert.equal(JSON.stringify(observation).includes("secret"), false);
});

test("rejects an invalid address before calling RPC", async () => {
  let called = false;
  const adapter = new SolanaRpcAdapter({
    cluster: "mainnet-beta",
    rpcUrl: "https://rpc.example",
    fetchImplementation: async () => {
      called = true;
      return jsonResponse({});
    },
  });

  await assert.rejects(
    adapter.getMint("not-a-solana-address"),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "INVALID_ADDRESS",
  );
  assert.equal(called, false);
});

test("classifies missing accounts and rate limits", async () => {
  const missing = new SolanaRpcAdapter({
    cluster: "mainnet-beta",
    rpcUrl: "https://rpc.example",
    fetchImplementation: async () =>
      jsonResponse({ result: { context: { slot: 1 }, value: null } }),
  });
  await assert.rejects(
    missing.getMint(spacexMint),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "ACCOUNT_NOT_FOUND",
  );

  const rateLimited = new SolanaRpcAdapter({
    cluster: "mainnet-beta",
    rpcUrl: "https://rpc.example",
    fetchImplementation: async () => jsonResponse({}, 429),
  });
  await assert.rejects(
    rateLimited.getMint(spacexMint),
    (error: unknown) =>
      error instanceof IntegrationError &&
      error.code === "RATE_LIMITED" &&
      error.retryable,
  );
});
