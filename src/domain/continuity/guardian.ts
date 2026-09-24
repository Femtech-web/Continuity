export type GuardianDecisionCode =
  | "SAFE"
  | "WAIT"
  | "APPROVAL_REQUIRED"
  | "BLOCKED"
  | "EXPIRED"
  | "ALREADY_COMPLETED";

export type EvaluationCheckState = "PASS" | "WATCH" | "FAIL";
export type Cluster = "mainnet-beta" | "devnet";
export type MarketSession =
  | "REGULAR"
  | "PRE_MARKET"
  | "POST_MARKET"
  | "OVERNIGHT"
  | "CLOSED";
export type RouteKind = "JUPITER" | "CLAWPUMP" | "DIRECT_METEORA";

export interface GuardianManifest {
  readonly id: string;
  readonly version: number;
  readonly status: "DRAFT" | "REVIEWED" | "ACTIVE" | "SUPERSEDED" | "WITHDRAWN";
  readonly cluster: Cluster;
  readonly sourceMint: string;
  readonly destinationMint: string;
  readonly sourceTokenProgram: string;
  readonly destinationTokenProgram: string;
  readonly deadlineAt: string;
  readonly requiresFreshQuote: boolean;
  readonly requiresMarketReference: boolean;
  readonly allowedRouteKinds: readonly RouteKind[];
}

export interface GuardianPolicy {
  readonly cluster: Cluster;
  readonly mode: "OBSERVE" | "PROPOSE" | "GUARDED_AUTOPILOT";
  readonly allowedSourceMints: readonly string[];
  readonly allowedDestinationMints: readonly string[];
  readonly allowedTokenPrograms: readonly string[];
  readonly allowedSessions: readonly MarketSession[];
  readonly allowedRouteKinds: readonly RouteKind[];
  readonly allowedProgramIds: readonly string[];
  readonly allowedIntermediateMints: readonly string[];
  readonly maxInputBaseUnits: string;
  readonly requireHumanAboveBaseUnits: string;
  readonly maxFeedAgeSeconds: number;
  readonly maxConfidenceBps: number;
  readonly maxQuoteAgeSeconds: number;
  readonly maxSlippageBps: number;
  readonly maxPriceImpactBps: number;
  readonly maxBasisBps: number;
  readonly missingFeedDecision: "WAIT" | "APPROVAL_REQUIRED" | "BLOCKED";
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

export interface MarketObservation {
  readonly session: MarketSession;
  readonly feedAgeSeconds: number;
  readonly confidenceBps: number;
}

export interface QuoteObservation {
  readonly kind: RouteKind;
  readonly ageSeconds: number;
  readonly slippageBps: number;
  readonly priceImpactBps: number;
  readonly basisBps: number;
  readonly programIds: readonly string[];
  readonly intermediateMints: readonly string[];
}

export interface GuardianEvaluationInput {
  readonly evaluatedAt: string;
  readonly manifest: GuardianManifest;
  readonly policy: GuardianPolicy;
  readonly walletBalanceBaseUnits: string;
  readonly requestedInputBaseUnits: string;
  readonly alreadyCompleted: boolean;
  readonly market: MarketObservation | null;
  readonly quote: QuoteObservation | null;
  readonly simulationPassed: boolean | null;
}

export interface EvaluationCheck {
  readonly id: string;
  readonly label: string;
  readonly state: EvaluationCheckState;
  readonly reasonCode: string;
}

export interface GuardianEvaluation {
  readonly decision: GuardianDecisionCode;
  readonly reasonCodes: readonly string[];
  readonly checks: readonly EvaluationCheck[];
  readonly evaluatedAt: string;
}

function parseBaseUnits(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new TypeError(`${field} must be an unsigned integer string`);
  }
  return BigInt(value);
}

function includesEvery(allowlist: readonly string[], values: readonly string[]): boolean {
  return values.every((value) => allowlist.includes(value));
}

function complete(
  input: GuardianEvaluationInput,
  checks: readonly EvaluationCheck[],
  decision: GuardianDecisionCode,
  ...reasonCodes: readonly string[]
): GuardianEvaluation {
  return { checks, decision, evaluatedAt: input.evaluatedAt, reasonCodes };
}

function check(
  id: string,
  label: string,
  state: EvaluationCheckState,
  reasonCode: string,
): EvaluationCheck {
  return { id, label, reasonCode, state };
}

/**
 * Pure Guardian policy evaluation. It performs no I/O and stops at the first
 * decisive gate, so identical inputs always yield identical ordered output.
 */
export function evaluateGuardian(input: GuardianEvaluationInput): GuardianEvaluation {
  const checks: EvaluationCheck[] = [];
  const evaluatedAt = Date.parse(input.evaluatedAt);

  if (!Number.isFinite(evaluatedAt)) {
    throw new TypeError("evaluatedAt must be a valid ISO-8601 timestamp");
  }

  if (input.manifest.status !== "ACTIVE") {
    checks.push(check("manifest", "Active manifest", "FAIL", "MANIFEST_NOT_ACTIVE"));
    return complete(input, checks, "BLOCKED", "MANIFEST_NOT_ACTIVE");
  }
  checks.push(check("manifest", "Active manifest", "PASS", "MANIFEST_ACTIVE"));

  const mintAndClusterAllowed =
    input.manifest.cluster === input.policy.cluster &&
    input.policy.allowedSourceMints.includes(input.manifest.sourceMint) &&
    input.policy.allowedDestinationMints.includes(input.manifest.destinationMint);
  if (!mintAndClusterAllowed) {
    checks.push(check("identity", "Instrument identity", "FAIL", "INSTRUMENT_NOT_ALLOWED"));
    return complete(input, checks, "BLOCKED", "INSTRUMENT_NOT_ALLOWED");
  }
  checks.push(check("identity", "Instrument identity", "PASS", "INSTRUMENT_ALLOWED"));

  const balance = parseBaseUnits(input.walletBalanceBaseUnits, "walletBalanceBaseUnits");
  const requested = parseBaseUnits(input.requestedInputBaseUnits, "requestedInputBaseUnits");
  const hardMaximum = parseBaseUnits(input.policy.maxInputBaseUnits, "maxInputBaseUnits");
  if (
    balance === BigInt(0) ||
    requested === BigInt(0) ||
    requested > balance ||
    requested > hardMaximum
  ) {
    checks.push(check("amount", "Eligible amount", "FAIL", "AMOUNT_OUTSIDE_HARD_LIMIT"));
    return complete(input, checks, "BLOCKED", "AMOUNT_OUTSIDE_HARD_LIMIT");
  }
  checks.push(check("amount", "Eligible amount", "PASS", "AMOUNT_ALLOWED"));

  if (input.alreadyCompleted) {
    checks.push(check("lifecycle", "Lifecycle state", "PASS", "ACTION_ALREADY_COMPLETED"));
    return complete(input, checks, "ALREADY_COMPLETED", "ACTION_ALREADY_COMPLETED");
  }

  const deadlineAt = Date.parse(input.manifest.deadlineAt);
  if (!Number.isFinite(deadlineAt)) {
    throw new TypeError("manifest.deadlineAt must be a valid ISO-8601 timestamp");
  }
  if (evaluatedAt >= deadlineAt) {
    checks.push(check("lifecycle", "Lifecycle deadline", "FAIL", "ACTION_DEADLINE_PASSED"));
    return complete(input, checks, "EXPIRED", "ACTION_DEADLINE_PASSED");
  }
  checks.push(check("lifecycle", "Lifecycle deadline", "PASS", "ACTION_CURRENT"));

  const policyExpiresAt = Date.parse(input.policy.expiresAt);
  if (!Number.isFinite(policyExpiresAt)) {
    throw new TypeError("policy.expiresAt must be a valid ISO-8601 timestamp");
  }
  if (input.policy.revokedAt !== null || evaluatedAt >= policyExpiresAt) {
    checks.push(check("policy", "Wallet policy", "FAIL", "POLICY_INACTIVE"));
    return complete(input, checks, "BLOCKED", "POLICY_INACTIVE");
  }
  checks.push(check("policy", "Wallet policy", "PASS", "POLICY_ACTIVE"));

  const tokenProgramsAllowed = includesEvery(input.policy.allowedTokenPrograms, [
    input.manifest.sourceTokenProgram,
    input.manifest.destinationTokenProgram,
  ]);
  if (!tokenProgramsAllowed) {
    checks.push(check("token-program", "Token programs", "FAIL", "TOKEN_PROGRAM_NOT_ALLOWED"));
    return complete(input, checks, "BLOCKED", "TOKEN_PROGRAM_NOT_ALLOWED");
  }
  checks.push(check("token-program", "Token programs", "PASS", "TOKEN_PROGRAMS_ALLOWED"));

  if (input.manifest.requiresMarketReference && input.market === null) {
    checks.push(check("market", "Reference market", "WATCH", "MARKET_REFERENCE_MISSING"));
    return complete(input, checks, input.policy.missingFeedDecision, "MARKET_REFERENCE_MISSING");
  }

  if (input.market !== null) {
    if (!input.policy.allowedSessions.includes(input.market.session)) {
      const reason = input.market.session === "CLOSED" ? "REFERENCE_MARKET_CLOSED" : "MARKET_SESSION_REQUIRES_APPROVAL";
      const decision = input.market.session === "CLOSED" ? "WAIT" : "APPROVAL_REQUIRED";
      checks.push(check("market", "Reference market", "WATCH", reason));
      return complete(input, checks, decision, reason);
    }
    if (input.market.feedAgeSeconds > input.policy.maxFeedAgeSeconds) {
      checks.push(check("market", "Reference market", "WATCH", "MARKET_FEED_STALE"));
      return complete(input, checks, "WAIT", "MARKET_FEED_STALE");
    }
    if (input.market.confidenceBps > input.policy.maxConfidenceBps) {
      checks.push(check("market", "Reference market", "WATCH", "MARKET_CONFIDENCE_TOO_WIDE"));
      return complete(input, checks, "WAIT", "MARKET_CONFIDENCE_TOO_WIDE");
    }
    checks.push(check("market", "Reference market", "PASS", "MARKET_REFERENCE_ACCEPTED"));
  }

  if (input.manifest.requiresFreshQuote && input.quote === null) {
    checks.push(check("quote", "Executable quote", "WATCH", "EXECUTABLE_QUOTE_MISSING"));
    return complete(input, checks, "WAIT", "EXECUTABLE_QUOTE_MISSING");
  }

  if (input.quote !== null) {
    const routeAllowed =
      input.manifest.allowedRouteKinds.includes(input.quote.kind) &&
      input.policy.allowedRouteKinds.includes(input.quote.kind) &&
      includesEvery(input.policy.allowedProgramIds, input.quote.programIds) &&
      includesEvery(input.policy.allowedIntermediateMints, input.quote.intermediateMints);
    if (!routeAllowed) {
      checks.push(check("route", "Execution route", "FAIL", "EXECUTION_ROUTE_NOT_ALLOWED"));
      return complete(input, checks, "BLOCKED", "EXECUTION_ROUTE_NOT_ALLOWED");
    }
    checks.push(check("route", "Execution route", "PASS", "EXECUTION_ROUTE_ALLOWED"));

    if (input.quote.ageSeconds > input.policy.maxQuoteAgeSeconds) {
      checks.push(check("quote", "Executable quote", "WATCH", "EXECUTABLE_QUOTE_STALE"));
      return complete(input, checks, "WAIT", "EXECUTABLE_QUOTE_STALE");
    }

    const economicsPass =
      input.quote.slippageBps <= input.policy.maxSlippageBps &&
      input.quote.priceImpactBps <= input.policy.maxPriceImpactBps &&
      input.quote.basisBps <= input.policy.maxBasisBps;
    if (!economicsPass) {
      checks.push(check("economics", "Execution economics", "WATCH", "EXECUTION_LIMIT_EXCEEDED"));
      return complete(input, checks, "WAIT", "EXECUTION_LIMIT_EXCEEDED");
    }
    checks.push(check("economics", "Execution economics", "PASS", "EXECUTION_LIMITS_PASS"));
  }

  if (input.simulationPassed === null) {
    checks.push(check("simulation", "Transaction simulation", "WATCH", "SIMULATION_REQUIRED"));
    return complete(input, checks, "WAIT", "SIMULATION_REQUIRED");
  }
  if (input.simulationPassed === false) {
    checks.push(check("simulation", "Transaction simulation", "FAIL", "SIMULATION_FAILED"));
    return complete(input, checks, "BLOCKED", "SIMULATION_FAILED");
  }
  checks.push(check("simulation", "Transaction simulation", "PASS", "SIMULATION_PASSED"));

  if (input.policy.mode === "OBSERVE") {
    checks.push(check("approval", "Execution authority", "FAIL", "POLICY_OBSERVE_ONLY"));
    return complete(input, checks, "BLOCKED", "POLICY_OBSERVE_ONLY");
  }

  const humanThreshold = parseBaseUnits(
    input.policy.requireHumanAboveBaseUnits,
    "requireHumanAboveBaseUnits",
  );
  if (input.policy.mode === "PROPOSE" || requested > humanThreshold) {
    checks.push(check("approval", "Owner approval", "WATCH", "OWNER_APPROVAL_REQUIRED"));
    return complete(input, checks, "APPROVAL_REQUIRED", "OWNER_APPROVAL_REQUIRED");
  }

  checks.push(check("approval", "Execution authority", "PASS", "POLICY_AUTHORIZES_ACTION"));
  return complete(input, checks, "SAFE", "ALL_GUARDIAN_CHECKS_PASS");
}
