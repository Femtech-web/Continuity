import assert from "node:assert/strict";
import test from "node:test";
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { SPCXX_MINT } from "../integrations/meteora-dbc.ts";
import { buildDemoMeteoraLaunchPlan } from "./meteora-launch-plan.ts";

test("builds a deterministic captured pre-approval plan", async () => {
  const first = await buildDemoMeteoraLaunchPlan();
  const second = await buildDemoMeteoraLaunchPlan();

  assert.equal(first.mode, "CAPTURED_FIXTURE");
  assert.equal(first.planHash, second.planHash);
  assert.equal(first.approval.enabled, false);
  assert.equal(first.simulation.state, "CAPTURED_PASS");
  assert.equal(first.transaction.serialized, null);
  assert.equal(first.transaction.quoteMint, SPCXX_MINT);
  assert.equal(first.instructions.length, 2);
  assert.ok(
    first.instructions.every(
      (instruction) =>
        instruction.programId === DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(),
    ),
  );
});

test("binds the ClawPump wallet to partner economic roles", async () => {
  const plan = await buildDemoMeteoraLaunchPlan();
  const agentAccount = plan.accounts.find(
    (account) => account.address === plan.authority.clawPumpAgentWallet,
  );
  const operatorAccount = plan.accounts.find(
    (account) => account.address === plan.authority.operatorWallet,
  );

  assert.deepEqual(agentAccount?.roles, [
    "ClawPump partner fee claimer",
    "Leftover receiver",
  ]);
  assert.equal(agentAccount?.writable, false);
  assert.deepEqual(operatorAccount?.roles, ["Operator payer", "Pool creator"]);
});
