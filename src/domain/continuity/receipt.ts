import type { Cluster, GuardianEvaluation } from "./guardian.ts";

type ReceiptOutcomeStatus =
  | "NOT_EXECUTED"
  | "SIMULATED"
  | "SUBMITTED"
  | "CONFIRMED"
  | "FAILED"
  | "UNKNOWN";

interface HashReference {
  readonly id: string;
  readonly version: number;
  readonly sha256: string;
}

interface ReceiptObservations {
  readonly sourceObservedAt: string;
  readonly chainSlot: number;
  readonly quoteObservedAt: string | null;
  readonly pyth: null | {
    readonly feedId: string;
    readonly updateTimestamp: string;
    readonly session: string;
    readonly price: string;
    readonly confidence: string;
  };
}

interface ReceiptAction {
  readonly sourceMint: string;
  readonly destinationMint: string;
  readonly inputBaseUnits: string;
  readonly minimumOutputBaseUnits: string;
  readonly routeLabels: readonly string[];
  readonly quoteId: string | null;
}

interface ReceiptOutcome {
  readonly status: ReceiptOutcomeStatus;
  readonly signature: string | null;
  readonly simulationError: string | null;
  readonly reconciled: boolean;
  readonly actualInputBaseUnits: string | null;
  readonly actualOutputBaseUnits: string | null;
}

export interface ActionReceipt {
  readonly schemaVersion: "1.0.0";
  readonly receiptId: string;
  readonly cluster: Cluster;
  readonly wallet: string;
  readonly manifest: HashReference;
  readonly policy: HashReference;
  readonly decision: {
    readonly code: GuardianEvaluation["decision"];
    readonly reasonCodes: readonly string[];
    readonly evaluatedAt: string;
  };
  readonly observations: ReceiptObservations;
  readonly action: ReceiptAction;
  readonly outcome: ReceiptOutcome;
  readonly approval: null | {
    readonly planHash: string;
    readonly approvedAt: string;
    readonly expiresAt: string;
  };
  readonly createdAt: string;
  readonly serverSignature: string | null;
  readonly onchainAnchor: null;
}

export interface BuildReceiptInput {
  readonly receiptId: string;
  readonly cluster: Cluster;
  readonly wallet: string;
  readonly manifest: HashReference;
  readonly policy: HashReference;
  readonly evaluation: GuardianEvaluation;
  readonly observations: ReceiptObservations;
  readonly action: ReceiptAction;
  readonly outcome: ReceiptOutcome;
  readonly approval?: ActionReceipt["approval"];
  readonly createdAt: string;
}

const base58PublicKey = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const sha256 = /^[a-f0-9]{64}$/;
const uintString = /^(0|[1-9][0-9]*)$/;

function requireTimestamp(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field} must be a valid ISO-8601 timestamp`);
  }
}

function requireHash(reference: HashReference, field: string): void {
  if (!reference.id || reference.version < 1 || !sha256.test(reference.sha256)) {
    throw new TypeError(`${field} must contain a valid id, version, and SHA-256 hash`);
  }
}

function freezeReceipt(receipt: ActionReceipt): ActionReceipt {
  Object.freeze(receipt.decision.reasonCodes);
  Object.freeze(receipt.decision);
  Object.freeze(receipt.observations.pyth);
  Object.freeze(receipt.observations);
  Object.freeze(receipt.action.routeLabels);
  Object.freeze(receipt.action);
  Object.freeze(receipt.outcome);
  Object.freeze(receipt.approval);
  Object.freeze(receipt.manifest);
  Object.freeze(receipt.policy);
  return Object.freeze(receipt);
}

/** Builds a schema-shaped immutable receipt and enforces non-execution claims. */
export function buildActionReceipt(input: BuildReceiptInput): ActionReceipt {
  if (input.receiptId.length < 8) {
    throw new TypeError("receiptId must contain at least eight characters");
  }
  if (!base58PublicKey.test(input.wallet)) {
    throw new TypeError("wallet must be a Solana public key");
  }
  requireHash(input.manifest, "manifest");
  requireHash(input.policy, "policy");
  requireTimestamp(input.createdAt, "createdAt");
  requireTimestamp(input.observations.sourceObservedAt, "sourceObservedAt");
  if (input.observations.quoteObservedAt !== null) {
    requireTimestamp(input.observations.quoteObservedAt, "quoteObservedAt");
  }
  if (input.observations.chainSlot < 0 || !Number.isInteger(input.observations.chainSlot)) {
    throw new TypeError("chainSlot must be a non-negative integer");
  }

  for (const [field, value] of [
    ["inputBaseUnits", input.action.inputBaseUnits],
    ["minimumOutputBaseUnits", input.action.minimumOutputBaseUnits],
  ] as const) {
    if (!uintString.test(value)) throw new TypeError(`${field} must be an unsigned integer string`);
  }
  if (!base58PublicKey.test(input.action.sourceMint)) {
    throw new TypeError("sourceMint must be a Solana public key");
  }
  if (!base58PublicKey.test(input.action.destinationMint)) {
    throw new TypeError("destinationMint must be a Solana public key");
  }

  const nonExecutableDecision = input.evaluation.decision !== "SAFE";
  if (
    nonExecutableDecision &&
    input.outcome.status !== "NOT_EXECUTED" &&
    input.outcome.status !== "FAILED"
  ) {
    throw new TypeError(
      `${input.evaluation.decision} cannot produce ${input.outcome.status}`,
    );
  }
  if (input.outcome.status === "NOT_EXECUTED" && input.outcome.signature !== null) {
    throw new TypeError("A non-executed receipt cannot contain a transaction signature");
  }
  if (input.outcome.reconciled && input.outcome.status !== "CONFIRMED") {
    throw new TypeError("Only a confirmed outcome can be marked reconciled");
  }

  return freezeReceipt({
    schemaVersion: "1.0.0",
    receiptId: input.receiptId,
    cluster: input.cluster,
    wallet: input.wallet,
    manifest: { ...input.manifest },
    policy: { ...input.policy },
    decision: {
      code: input.evaluation.decision,
      reasonCodes: [...input.evaluation.reasonCodes],
      evaluatedAt: input.evaluation.evaluatedAt,
    },
    observations: {
      ...input.observations,
      pyth: input.observations.pyth === null ? null : { ...input.observations.pyth },
    },
    action: {
      ...input.action,
      routeLabels: [...input.action.routeLabels],
    },
    outcome: { ...input.outcome },
    approval: input.approval === undefined || input.approval === null
      ? null
      : { ...input.approval },
    createdAt: input.createdAt,
    serverSignature: null,
    onchainAnchor: null,
  });
}
