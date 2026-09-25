export type QuoteRailVerdictCode =
  | "LAUNCH_SAFE"
  | "MANUAL_REVIEW"
  | "LAUNCH_BLOCKED"
  | "ROLLOVER_REQUIRED";

export type QuoteRailReasonCode =
  | "QUOTE_MINT_MISMATCH"
  | "QUOTE_BADGE_MISSING"
  | "TOKEN_PROGRAM_NOT_ALLOWED"
  | "CONFIG_ATTESTATION_PENDING"
  | "CONFIG_HASH_MISMATCH"
  | "LIFECYCLE_EVIDENCE_MISSING"
  | "LIFECYCLE_EVIDENCE_CONFLICTED"
  | "LIFECYCLE_EVIDENCE_STALE"
  | "LIFECYCLE_REVIEW_REQUIRED"
  | "QUOTE_INSTRUMENT_RETIRING"
  | "QUOTE_INSTRUMENT_SUPERSEDED"
  | "MARKET_REFERENCE_UNAVAILABLE"
  | "MARKET_REFERENCE_STALE"
  | "ALL_CHECKS_PASS";

export interface QuoteRailEvaluationInput {
  readonly evaluatedAt: string;
  readonly market: {
    readonly state: "PROPOSED" | "ACTIVE" | "MIGRATED";
    readonly baseMint: string;
    readonly quoteMint: string;
    readonly expectedQuoteMint: string;
    readonly configHashMatches: boolean | null;
  };
  readonly quoteAsset: {
    readonly symbol: string;
    readonly lifecycleStatus:
      | "CURRENT"
      | "RETIRING"
      | "SUPERSEDED"
      | "UNKNOWN";
    readonly successorMint: string | null;
    readonly successorSymbol: string | null;
    readonly tokenProgramAllowed: boolean;
    readonly dbcBadgeVerified: boolean;
  };
  readonly manifest: {
    readonly id: string;
    readonly version: number;
    readonly hash: string;
    readonly evidenceStatus:
      | "VERIFIED"
      | "UNREVIEWED"
      | "STALE"
      | "MISSING"
      | "CONFLICTED";
  };
  readonly marketReference: {
    readonly status: "FRESH" | "STALE" | "MISSING" | "CLOSED";
    readonly observedAt: string | null;
  };
}

export interface QuoteRailCheck {
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface RolloverPlan {
  readonly fromQuoteMint: string;
  readonly toQuoteMint: string;
  readonly toQuoteSymbol: string;
  readonly action: "PREPARE_SUCCESSOR_DBC";
  readonly existingConfigMutable: false;
}

export interface QuoteRailEvaluation {
  readonly code: QuoteRailVerdictCode;
  readonly reasons: readonly QuoteRailReasonCode[];
  readonly checks: readonly QuoteRailCheck[];
  readonly rolloverPlan: RolloverPlan | null;
  readonly evaluatedAt: string;
}

function lifecycleReason(
  lifecycleStatus: QuoteRailEvaluationInput["quoteAsset"]["lifecycleStatus"],
): QuoteRailReasonCode | null {
  if (lifecycleStatus === "RETIRING") return "QUOTE_INSTRUMENT_RETIRING";
  if (lifecycleStatus === "SUPERSEDED") return "QUOTE_INSTRUMENT_SUPERSEDED";
  return null;
}

export function evaluateQuoteRail(
  input: QuoteRailEvaluationInput,
): QuoteRailEvaluation {
  const reasons: QuoteRailReasonCode[] = [];
  const checks: QuoteRailCheck[] = [
    {
      label: "Exact quote mint",
      passed: input.market.quoteMint === input.market.expectedQuoteMint,
      detail:
        input.market.quoteMint === input.market.expectedQuoteMint
          ? "Configured mint matches the attested quote asset"
          : "Configured quote mint differs from the attested mint",
    },
    {
      label: "Meteora DBC badge",
      passed: input.quoteAsset.dbcBadgeVerified,
      detail: input.quoteAsset.dbcBadgeVerified
        ? "Quote asset badge is verified"
        : "Required custom quote badge was not verified",
    },
    {
      label: "Token program",
      passed: input.quoteAsset.tokenProgramAllowed,
      detail: input.quoteAsset.tokenProgramAllowed
        ? "Token program is allowed by policy"
        : "Token program is outside policy",
    },
    {
      label: "Configuration hash",
      passed: input.market.configHashMatches === true,
      detail:
        input.market.configHashMatches === null
          ? "Post-launch configuration hash attestation is pending"
          : input.market.configHashMatches
            ? "Observed configuration matches the attested hash"
            : "Observed configuration differs from the attested hash",
    },
    {
      label: "Lifecycle evidence",
      passed: input.manifest.evidenceStatus === "VERIFIED",
      detail: `Manifest evidence is ${input.manifest.evidenceStatus.toLowerCase()}`,
    },
    {
      label: "Market reference",
      passed: input.marketReference.status === "FRESH",
      detail: `Reference state is ${input.marketReference.status.toLowerCase()}`,
    },
  ];

  if (input.market.quoteMint !== input.market.expectedQuoteMint) {
    reasons.push("QUOTE_MINT_MISMATCH");
  }
  if (!input.quoteAsset.dbcBadgeVerified) reasons.push("QUOTE_BADGE_MISSING");
  if (!input.quoteAsset.tokenProgramAllowed) {
    reasons.push("TOKEN_PROGRAM_NOT_ALLOWED");
  }
  if (input.market.configHashMatches === false) {
    reasons.push("CONFIG_HASH_MISMATCH");
  } else if (input.market.configHashMatches === null) {
    reasons.push("CONFIG_ATTESTATION_PENDING");
  }

  if (input.manifest.evidenceStatus === "MISSING") {
    reasons.push("LIFECYCLE_EVIDENCE_MISSING");
  } else if (input.manifest.evidenceStatus === "CONFLICTED") {
    reasons.push("LIFECYCLE_EVIDENCE_CONFLICTED");
  } else if (input.manifest.evidenceStatus === "STALE") {
    reasons.push("LIFECYCLE_EVIDENCE_STALE");
  } else if (input.manifest.evidenceStatus === "UNREVIEWED") {
    reasons.push("LIFECYCLE_REVIEW_REQUIRED");
  }

  const instrumentLifecycleReason = lifecycleReason(
    input.quoteAsset.lifecycleStatus,
  );
  if (instrumentLifecycleReason) reasons.push(instrumentLifecycleReason);

  if (input.marketReference.status === "STALE") {
    reasons.push("MARKET_REFERENCE_STALE");
  } else if (
    input.marketReference.status === "MISSING" ||
    input.marketReference.status === "CLOSED"
  ) {
    reasons.push("MARKET_REFERENCE_UNAVAILABLE");
  }

  const hardIdentityFailure = reasons.some((reason) =>
    [
      "QUOTE_MINT_MISMATCH",
      "QUOTE_BADGE_MISSING",
      "TOKEN_PROGRAM_NOT_ALLOWED",
      "CONFIG_HASH_MISMATCH",
      "LIFECYCLE_EVIDENCE_MISSING",
      "LIFECYCLE_EVIDENCE_CONFLICTED",
    ].includes(reason),
  );

  const lifecycleChanged = instrumentLifecycleReason !== null;
  const code: QuoteRailVerdictCode = hardIdentityFailure
    ? "LAUNCH_BLOCKED"
    : lifecycleChanged && input.market.state !== "PROPOSED"
      ? "ROLLOVER_REQUIRED"
      : lifecycleChanged
        ? "LAUNCH_BLOCKED"
        : reasons.length > 0
          ? "MANUAL_REVIEW"
          : "LAUNCH_SAFE";

  if (reasons.length === 0) reasons.push("ALL_CHECKS_PASS");

  const rolloverPlan =
    code === "ROLLOVER_REQUIRED" &&
    input.quoteAsset.successorMint &&
    input.quoteAsset.successorSymbol
      ? {
          fromQuoteMint: input.market.quoteMint,
          toQuoteMint: input.quoteAsset.successorMint,
          toQuoteSymbol: input.quoteAsset.successorSymbol,
          action: "PREPARE_SUCCESSOR_DBC" as const,
          existingConfigMutable: false as const,
        }
      : null;

  return {
    code,
    reasons,
    checks,
    rolloverPlan,
    evaluatedAt: input.evaluatedAt,
  };
}
