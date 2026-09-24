import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateGuardian,
  type GuardianEvaluationInput,
} from "./guardian.ts";

const sourceMint = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const destinationMint = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const tokenProgram = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const routeProgram = "route11111111111111111111111111111111111";

function createInput(
  overrides: Partial<GuardianEvaluationInput> = {},
): GuardianEvaluationInput {
  return {
    evaluatedAt: "2026-09-23T14:00:00Z",
    manifest: {
      id: "prestocks-spacex-ipo-2026",
      version: 1,
      status: "ACTIVE",
      cluster: "mainnet-beta",
      sourceMint,
      destinationMint,
      sourceTokenProgram: tokenProgram,
      destinationTokenProgram: tokenProgram,
      deadlineAt: "2027-03-12T23:59:00Z",
      requiresFreshQuote: true,
      requiresMarketReference: true,
      allowedRouteKinds: ["JUPITER", "CLAWPUMP", "DIRECT_METEORA"],
    },
    policy: {
      cluster: "mainnet-beta",
      mode: "GUARDED_AUTOPILOT",
      allowedSourceMints: [sourceMint],
      allowedDestinationMints: [destinationMint],
      allowedTokenPrograms: [tokenProgram],
      allowedSessions: ["REGULAR"],
      allowedRouteKinds: ["DIRECT_METEORA"],
      allowedProgramIds: [routeProgram],
      allowedIntermediateMints: [],
      maxInputBaseUnits: "5000",
      requireHumanAboveBaseUnits: "2500",
      maxFeedAgeSeconds: 30,
      maxConfidenceBps: 75,
      maxQuoteAgeSeconds: 20,
      maxSlippageBps: 50,
      maxPriceImpactBps: 50,
      maxBasisBps: 100,
      missingFeedDecision: "WAIT",
      expiresAt: "2027-03-12T23:59:00Z",
      revokedAt: null,
    },
    walletBalanceBaseUnits: "2400",
    requestedInputBaseUnits: "2400",
    alreadyCompleted: false,
    market: { session: "REGULAR", feedAgeSeconds: 8, confidenceBps: 18 },
    quote: {
      kind: "DIRECT_METEORA",
      ageSeconds: 4,
      slippageBps: 25,
      priceImpactBps: 34,
      basisBps: 41,
      programIds: [routeProgram],
      intermediateMints: [],
    },
    simulationPassed: true,
    ...overrides,
  };
}

test("SAFE when every ordered Guardian gate passes", () => {
  const result = evaluateGuardian(createInput());
  assert.equal(result.decision, "SAFE");
  assert.deepEqual(result.reasonCodes, ["ALL_GUARDIAN_CHECKS_PASS"]);
});

test("WAIT while the reference market is closed", () => {
  const result = evaluateGuardian(
    createInput({ market: { session: "CLOSED", feedAgeSeconds: 8, confidenceBps: 18 } }),
  );
  assert.equal(result.decision, "WAIT");
  assert.deepEqual(result.reasonCodes, ["REFERENCE_MARKET_CLOSED"]);
  assert.equal(result.checks.at(-1)?.id, "market");
});

test("APPROVAL_REQUIRED above the configured human threshold", () => {
  const input = createInput({
    requestedInputBaseUnits: "3000",
    walletBalanceBaseUnits: "3000",
  });
  const result = evaluateGuardian(input);
  assert.equal(result.decision, "APPROVAL_REQUIRED");
  assert.deepEqual(result.reasonCodes, ["OWNER_APPROVAL_REQUIRED"]);
});

test("BLOCKED for a destination mint outside policy", () => {
  const input = createInput({
    manifest: { ...createInput().manifest, destinationMint: sourceMint },
  });
  const result = evaluateGuardian(input);
  assert.equal(result.decision, "BLOCKED");
  assert.deepEqual(result.reasonCodes, ["INSTRUMENT_NOT_ALLOWED"]);
});

test("BLOCKED policy revocation takes priority over temporary market state", () => {
  const base = createInput();
  const result = evaluateGuardian(
    createInput({
      market: { session: "CLOSED", feedAgeSeconds: 8, confidenceBps: 18 },
      policy: { ...base.policy, revokedAt: "2026-09-23T13:00:00Z" },
    }),
  );
  assert.equal(result.decision, "BLOCKED");
  assert.deepEqual(result.reasonCodes, ["POLICY_INACTIVE"]);
});

test("WAIT until a transaction simulation result exists", () => {
  const result = evaluateGuardian(createInput({ simulationPassed: null }));
  assert.equal(result.decision, "WAIT");
  assert.deepEqual(result.reasonCodes, ["SIMULATION_REQUIRED"]);
});

test("EXPIRED after the issuer deadline", () => {
  const result = evaluateGuardian(
    createInput({ evaluatedAt: "2027-03-13T00:00:00Z" }),
  );
  assert.equal(result.decision, "EXPIRED");
});

test("ALREADY_COMPLETED is terminal and does not inspect market data", () => {
  const result = evaluateGuardian(
    createInput({ alreadyCompleted: true, market: null, quote: null }),
  );
  assert.equal(result.decision, "ALREADY_COMPLETED");
  assert.equal(result.checks.at(-1)?.id, "lifecycle");
});

test("identical input produces identical ordered output", () => {
  const input = createInput();
  assert.deepEqual(evaluateGuardian(input), evaluateGuardian(input));
});
