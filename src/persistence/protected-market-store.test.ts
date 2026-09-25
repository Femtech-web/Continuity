import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureReferenceOperatorAgentMapping,
  type ProtectedMarketDatabase,
} from "./protected-market-store.ts";

test("hands an unlaunched reference agent to the newly configured operator", async () => {
  const resources: string[] = [];
  const database: ProtectedMarketDatabase = {
    async request<T>(resource: string): Promise<T> {
      resources.push(resource);
      if (resource === "operator_agents") {
        return [{
          agent_name: "Continuity Sentinel",
          clawpump_agent_id: "sentinel-agent",
          clawpump_wallet_address: "2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ",
          id: 1,
          operator_id: 1,
        }] as T;
      }
      if (resource === "rpc/claim_reference_launch_ownership") {
        return [{
          agent_name: "Continuity Sentinel",
          clawpump_agent_id: "sentinel-agent",
          clawpump_wallet_address: "2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ",
          id: 1,
        }] as T;
      }
      throw new Error(`Unexpected resource: ${resource}`);
    },
  };

  const mapping = await ensureReferenceOperatorAgentMapping({
    agentName: "Continuity Sentinel",
    clawPumpAgentId: "sentinel-agent",
    clawPumpWalletAddress: "2WS9kyBPFwgfoepmye5VpxbM4PrBa23f6GuiySJmikSQ",
    operatorId: 2,
  }, database);

  assert.equal(mapping.id, 1);
  assert.deepEqual(resources, [
    "operator_agents",
    "rpc/claim_reference_launch_ownership",
  ]);
});
