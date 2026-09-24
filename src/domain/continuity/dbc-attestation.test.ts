import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateDbcAttestation,
  type DbcAttestationInput,
} from "./dbc-attestation.ts";

const quoteMint = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const configAddress = "11111111111111111111111111111111";

const input = {
  expected: {
    badgeAddress: "GTMnHQs6KLNq14FkfTU2Zp5TEbeqMNSUqoWGihi1qHzP",
    quoteMint,
    tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  },
  observed: {
    badge: {
      address: "GTMnHQs6KLNq14FkfTU2Zp5TEbeqMNSUqoWGihi1qHzP",
      tokenMint: quoteMint,
    },
    config: null,
    mint: {
      address: quoteMint,
      extensions: ["metadataPointer"],
      tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    },
    pool: null,
  },
} as const satisfies DbcAttestationInput;

test("marks a verified quote asset ready while launch accounts are pending", () => {
  const result = evaluateDbcAttestation(input);

  assert.equal(result.state, "QUOTE_READY");
  assert.deepEqual(
    result.checks.map((check) => check.state),
    ["PASS", "PASS", "PASS", "PENDING", "PENDING"],
  );
});

test("attests a live pool only when it uses the reviewed config and quote mint", () => {
  const result = evaluateDbcAttestation({
    ...input,
    observed: {
      ...input.observed,
      config: { address: configAddress, found: true, quoteMint },
      pool: {
        address: "SysvarRent111111111111111111111111111111111",
        configAddress,
        found: true,
        quoteMint,
      },
    },
  });

  assert.equal(result.state, "POOL_LIVE");
});

test("fails closed on a badge mismatch or transfer-fee extension", () => {
  const result = evaluateDbcAttestation({
    ...input,
    observed: {
      ...input.observed,
      badge: null,
      mint: {
        ...input.observed.mint,
        extensions: ["transferFeeConfig"],
      },
    },
  });

  assert.equal(result.state, "BLOCKED");
  assert.equal(result.checks.find((check) => check.key === "badge")?.state, "FAIL");
  assert.equal(
    result.checks.find((check) => check.key === "transfer-fee")?.state,
    "FAIL",
  );
});
