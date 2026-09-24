import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@solana/web3.js";
import { ClawPumpAdapter } from "./clawpump.ts";
import { IntegrationError } from "./integration-error.ts";

const agentWallet = Keypair.generate().publicKey.toBase58();

test("authenticates an owned ClawPump agent and maps its economic authority", async () => {
  let authorization = "";
  const adapter = new ClawPumpAdapter({
    agentId: "continuity-agent",
    apiKey: "cpk_secret",
    baseUrl: "https://clawpump.example/api/v1",
    now: () => new Date("2026-09-24T12:00:00.000Z"),
    fetchImplementation: async (_input, init) => {
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      return Response.json({
        id: "continuity-agent",
        name: "Continuity Sentinel",
        status: "running",
        walletAddress: agentWallet,
        skills: ["trading", "token-launch"],
        meta: { requestId: "req-42" },
      });
    },
  });

  const result = await adapter.resolveLaunchAuthority();

  assert.equal(authorization, "Bearer cpk_secret");
  assert.equal(result.agent.walletAddress, agentWallet);
  assert.equal(result.authority.partnerFeeClaimer, agentWallet);
  assert.equal(result.authority.poolCreator, "CONNECTED_OPERATOR");
  assert.equal(result.authority.documentedDbcLaunchEndpoint, false);
  assert.equal(result.provenance.requestId, "req-42");
});

test("fails before making a request when ClawPump credentials are absent", async () => {
  let called = false;
  const adapter = new ClawPumpAdapter({
    agentId: null,
    apiKey: null,
    fetchImplementation: async () => {
      called = true;
      return Response.json({});
    },
  });

  await assert.rejects(
    () => adapter.resolveLaunchAuthority(),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "AUTH_REQUIRED",
  );
  assert.equal(called, false);
});

test("never echoes a rejected ClawPump key", async () => {
  const secret = "cpk_do-not-leak";
  const adapter = new ClawPumpAdapter({
    agentId: "continuity-agent",
    apiKey: secret,
    fetchImplementation: async () =>
      Response.json({ error: "invalid" }, { status: 401 }),
  });

  await assert.rejects(
    () => adapter.resolveLaunchAuthority(),
    (error: unknown) =>
      error instanceof Error && !error.message.includes(secret),
  );
});
