import assert from "node:assert/strict";
import test from "node:test";
import { readServerEnvironment } from "./server-environment.ts";

test("uses the public mainnet RPC as a safe default", () => {
  const environment = readServerEnvironment({});

  assert.equal(environment.solana.cluster, "mainnet-beta");
  assert.equal(environment.solana.rpcUrl, "https://api.mainnet-beta.solana.com/");
  assert.equal(environment.solana.timeoutMs, 7_000);
  assert.equal(environment.clawpump.agentId, null);
  assert.equal(environment.clawpump.apiKey, null);
  assert.equal(environment.clawpump.baseUrl, "https://clawpump.tech/api/v1");
  assert.equal(environment.cont.metadataUri, null);
  assert.equal(environment.meteora.configAddress, null);
  assert.equal(environment.meteora.poolAddress, null);
  assert.equal(environment.prestocks.catalogUrl, "https://prestocks.com/api/prestocks");
  assert.equal(environment.prestocks.pageUrl, "https://prestocks.com/spacex");
  assert.equal(environment.pyth.apiKey, null);
  assert.equal(environment.pyth.feedId, 3329);
  assert.equal(environment.pyth.channel, "fixed_rate@200ms");
});

test("prefers a server-only RPC URL over the browser setting", () => {
  const environment = readServerEnvironment({
    SOLANA_CLUSTER: "devnet",
    SOLANA_RPC_URL: "https://server-rpc.example/rpc?key=secret",
    NEXT_PUBLIC_SOLANA_RPC_URL: "https://browser-rpc.example",
    SOLANA_RPC_TIMEOUT_MS: "2500",
    CLAWPUMP_AGENT_ID: "continuity-agent",
    CLAWPUMP_API_KEY: "cpk_server-secret",
    CLAWPUMP_API_URL: "https://clawpump.example/api/v1",
    CLAWPUMP_TIMEOUT_MS: "9000",
    CONT_TOKEN_METADATA_URI: "https://continuity.example/metadata/cont.json",
    PRESTOCKS_CATALOG_URL: "https://source.example/catalog",
    PRESTOCKS_SPACEX_URL: "https://source.example/spacex",
    PRESTOCKS_TIMEOUT_MS: "3200",
    METEORA_DBC_CONFIG_ADDRESS: "11111111111111111111111111111111",
    PYTH_PRO_API_KEY: "server-secret",
    PYTH_PRO_BASE_URL: "https://pyth.example",
    PYTH_SPCXX_USD_FEED_ID: "3329",
  });

  assert.equal(environment.solana.cluster, "devnet");
  assert.equal(environment.solana.rpcUrl, "https://server-rpc.example/rpc?key=secret");
  assert.equal(environment.solana.timeoutMs, 2_500);
  assert.equal(environment.clawpump.agentId, "continuity-agent");
  assert.equal(environment.clawpump.apiKey, "cpk_server-secret");
  assert.equal(environment.clawpump.baseUrl, "https://clawpump.example/api/v1");
  assert.equal(environment.clawpump.timeoutMs, 9_000);
  assert.equal(
    environment.cont.metadataUri,
    "https://continuity.example/metadata/cont.json",
  );
  assert.equal(environment.prestocks.catalogUrl, "https://source.example/catalog");
  assert.equal(environment.prestocks.timeoutMs, 3_200);
  assert.equal(
    environment.meteora.configAddress,
    "11111111111111111111111111111111",
  );
  assert.equal(environment.pyth.apiKey, "server-secret");
  assert.equal(environment.pyth.baseUrl, "https://pyth.example/");
});

test("rejects unsupported clusters and unsafe URL protocols", () => {
  assert.throws(
    () => readServerEnvironment({ SOLANA_CLUSTER: "testnet" }),
    /SOLANA_CLUSTER/,
  );
  assert.throws(
    () => readServerEnvironment({ SOLANA_RPC_URL: "file:///tmp/rpc" }),
    /http or https/,
  );
  assert.throws(
    () => readServerEnvironment({ METEORA_DBC_POOL_ADDRESS: "not-an-address" }),
    /METEORA_DBC_POOL_ADDRESS/,
  );
  assert.throws(
    () => readServerEnvironment({ PYTH_SPCXX_USD_FEED_ID: "SPCXx" }),
    /PYTH_SPCXX_USD_FEED_ID/,
  );
  assert.throws(
    () => readServerEnvironment({ CONT_TOKEN_METADATA_URI: "ipfs://cont" }),
    /http or https/,
  );
});
