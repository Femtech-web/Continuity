export type ManifestStatus =
  | "ACTIVE"
  | "DRAFT"
  | "REVIEWED"
  | "SUPERSEDED"
  | "WITHDRAWN";

export type ManifestRouteKind =
  | "CLAWPUMP"
  | "DIRECT_METEORA"
  | "ISSUER_UI"
  | "JUPITER"
  | "MANUAL";

export interface ManifestInstrument {
  readonly chain: "solana";
  readonly cluster: "devnet" | "mainnet-beta";
  readonly mint: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly tokenProgram: string;
  readonly provider: string;
  readonly termsUrl?: string;
}

export interface ManifestSource {
  readonly publisher: string;
  readonly url: string;
  readonly observedAt: string;
  readonly contentSha256: string;
  readonly excerpt?: string;
}

export interface ActionManifest {
  readonly schemaVersion: "1.0.0";
  readonly manifestId: string;
  readonly manifestVersion: number;
  readonly status: ManifestStatus;
  readonly canonicalExposureId: string;
  readonly eventType:
    | "ACQUISITION"
    | "DELISTING"
    | "DISTRIBUTION"
    | "EXPIRY"
    | "IPO_TRANSITION"
    | "OTHER"
    | "REDEMPTION"
    | "SPLIT";
  readonly actionType:
    | "FIXED_RATIO_CONVERSION"
    | "HOLD"
    | "ISSUER_REDEMPTION"
    | "MANUAL_ACTION"
    | "MARKET_SWAP";
  readonly sourceInstrument: ManifestInstrument;
  readonly targetInstrument: ManifestInstrument;
  readonly effectiveAt: string;
  readonly deadlineAt: string;
  readonly fixedRatio: null | {
    readonly numerator: string;
    readonly denominator: string;
  };
  readonly sources: readonly ManifestSource[];
  readonly executionConstraints: {
    readonly allowedClusters: readonly ("devnet" | "mainnet-beta")[];
    readonly allowedRouteKinds: readonly ManifestRouteKind[];
    readonly requiresFreshQuote: boolean;
    readonly requiresMarketReference: boolean;
    readonly notes?: string;
  };
  readonly review: {
    readonly reviewedBy: string;
    readonly reviewedAt: string;
    readonly supersedesVersion: number | null;
  };
}

export interface ManifestValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ManifestValidationResult =
  | { readonly success: true; readonly data: ActionManifest; readonly issues: readonly [] }
  | { readonly success: false; readonly issues: readonly ManifestValidationIssue[] };

const manifestIdPattern = /^[a-z0-9][a-z0-9-]{2,127}$/;
const publicKeyPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const unsignedIntegerPattern = /^(0|[1-9][0-9]*)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function addIssue(
  issues: ManifestValidationIssue[],
  path: string,
  message: string,
) {
  issues.push({ path, message });
}

function validateInstrument(
  value: unknown,
  path: string,
  issues: ManifestValidationIssue[],
) {
  if (!isRecord(value)) {
    addIssue(issues, path, "must be an object");
    return;
  }
  if (value.chain !== "solana") addIssue(issues, `${path}.chain`, "must be solana");
  if (value.cluster !== "mainnet-beta" && value.cluster !== "devnet") {
    addIssue(issues, `${path}.cluster`, "must be mainnet-beta or devnet");
  }
  if (typeof value.mint !== "string" || !publicKeyPattern.test(value.mint)) {
    addIssue(issues, `${path}.mint`, "must be a base58 Solana address");
  }
  if (
    typeof value.symbol !== "string" ||
    value.symbol.length < 1 ||
    value.symbol.length > 16
  ) {
    addIssue(issues, `${path}.symbol`, "must contain 1 to 16 characters");
  }
  if (
    typeof value.decimals !== "number" ||
    !Number.isInteger(value.decimals) ||
    value.decimals < 0 ||
    value.decimals > 18
  ) {
    addIssue(issues, `${path}.decimals`, "must be an integer from 0 to 18");
  }
  if (
    typeof value.tokenProgram !== "string" ||
    !publicKeyPattern.test(value.tokenProgram)
  ) {
    addIssue(issues, `${path}.tokenProgram`, "must be a base58 Solana address");
  }
  if (typeof value.provider !== "string" || value.provider.length === 0) {
    addIssue(issues, `${path}.provider`, "is required");
  }
  if (value.termsUrl !== undefined && !isHttpUrl(value.termsUrl)) {
    addIssue(issues, `${path}.termsUrl`, "must be an HTTP URL");
  }
}

/** Validates the runtime manifest contract and cross-field lifecycle invariants. */
export function validateActionManifest(value: unknown): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = [];
  if (!isRecord(value)) {
    return { success: false, issues: [{ path: "$", message: "must be an object" }] };
  }

  if (value.schemaVersion !== "1.0.0") {
    addIssue(issues, "$.schemaVersion", "must equal 1.0.0");
  }
  if (typeof value.manifestId !== "string" || !manifestIdPattern.test(value.manifestId)) {
    addIssue(issues, "$.manifestId", "must use the canonical manifest id format");
  }
  if (
    typeof value.manifestVersion !== "number" ||
    !Number.isInteger(value.manifestVersion) ||
    value.manifestVersion < 1
  ) {
    addIssue(issues, "$.manifestVersion", "must be a positive integer");
  }
  if (!["DRAFT", "REVIEWED", "ACTIVE", "SUPERSEDED", "WITHDRAWN"].includes(String(value.status))) {
    addIssue(issues, "$.status", "must be a supported manifest state");
  }
  if (
    typeof value.canonicalExposureId !== "string" ||
    value.canonicalExposureId.length < 3
  ) {
    addIssue(issues, "$.canonicalExposureId", "is required");
  }
  if (
    ![
      "IPO_TRANSITION",
      "ACQUISITION",
      "REDEMPTION",
      "SPLIT",
      "DISTRIBUTION",
      "DELISTING",
      "EXPIRY",
      "OTHER",
    ].includes(String(value.eventType))
  ) {
    addIssue(issues, "$.eventType", "must be a supported lifecycle event");
  }
  if (
    ![
      "MARKET_SWAP",
      "FIXED_RATIO_CONVERSION",
      "ISSUER_REDEMPTION",
      "HOLD",
      "MANUAL_ACTION",
    ].includes(String(value.actionType))
  ) {
    addIssue(issues, "$.actionType", "must be a supported action");
  }

  validateInstrument(value.sourceInstrument, "$.sourceInstrument", issues);
  validateInstrument(value.targetInstrument, "$.targetInstrument", issues);

  if (!isTimestamp(value.effectiveAt)) {
    addIssue(issues, "$.effectiveAt", "must be an ISO-8601 timestamp");
  }
  if (!isTimestamp(value.deadlineAt)) {
    addIssue(issues, "$.deadlineAt", "must be an ISO-8601 timestamp");
  }
  if (
    isTimestamp(value.effectiveAt) &&
    isTimestamp(value.deadlineAt) &&
    Date.parse(value.deadlineAt) <= Date.parse(value.effectiveAt)
  ) {
    addIssue(issues, "$.deadlineAt", "must occur after the effective time");
  }

  if (value.actionType === "MARKET_SWAP" && value.fixedRatio !== null) {
    addIssue(issues, "$.fixedRatio", "must be null for a market swap");
  }
  if (value.actionType === "FIXED_RATIO_CONVERSION") {
    if (!isRecord(value.fixedRatio)) {
      addIssue(issues, "$.fixedRatio", "is required for a fixed-ratio conversion");
    } else {
      if (
        typeof value.fixedRatio.numerator !== "string" ||
        !unsignedIntegerPattern.test(value.fixedRatio.numerator)
      ) {
        addIssue(issues, "$.fixedRatio.numerator", "must be an unsigned integer string");
      }
      if (
        typeof value.fixedRatio.denominator !== "string" ||
        !/^[1-9][0-9]*$/.test(value.fixedRatio.denominator)
      ) {
        addIssue(issues, "$.fixedRatio.denominator", "must be a positive integer string");
      }
    }
  }

  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    addIssue(issues, "$.sources", "must contain at least one source");
  } else {
    value.sources.forEach((source, index) => {
      const path = `$.sources[${index}]`;
      if (!isRecord(source)) {
        addIssue(issues, path, "must be an object");
        return;
      }
      if (typeof source.publisher !== "string" || source.publisher.length === 0) {
        addIssue(issues, `${path}.publisher`, "is required");
      }
      if (!isHttpUrl(source.url)) addIssue(issues, `${path}.url`, "must be an HTTP URL");
      if (!isTimestamp(source.observedAt)) {
        addIssue(issues, `${path}.observedAt`, "must be an ISO-8601 timestamp");
      }
      if (
        typeof source.contentSha256 !== "string" ||
        !sha256Pattern.test(source.contentSha256)
      ) {
        addIssue(issues, `${path}.contentSha256`, "must be a lowercase SHA-256 digest");
      } else if (
        (value.status === "REVIEWED" || value.status === "ACTIVE") &&
        /^0{64}$/.test(source.contentSha256)
      ) {
        addIssue(issues, `${path}.contentSha256`, "cannot be a placeholder hash");
      }
      if (typeof source.excerpt === "string" && source.excerpt.length > 500) {
        addIssue(issues, `${path}.excerpt`, "must not exceed 500 characters");
      }
    });
  }

  if (!isRecord(value.executionConstraints)) {
    addIssue(issues, "$.executionConstraints", "must be an object");
  } else {
    if (
      !Array.isArray(value.executionConstraints.allowedClusters) ||
      value.executionConstraints.allowedClusters.length === 0
    ) {
      addIssue(issues, "$.executionConstraints.allowedClusters", "must not be empty");
    }
    if (
      !Array.isArray(value.executionConstraints.allowedRouteKinds) ||
      value.executionConstraints.allowedRouteKinds.length === 0
    ) {
      addIssue(issues, "$.executionConstraints.allowedRouteKinds", "must not be empty");
    }
    if (typeof value.executionConstraints.requiresFreshQuote !== "boolean") {
      addIssue(issues, "$.executionConstraints.requiresFreshQuote", "must be boolean");
    }
    if (typeof value.executionConstraints.requiresMarketReference !== "boolean") {
      addIssue(issues, "$.executionConstraints.requiresMarketReference", "must be boolean");
    }
  }

  if (!isRecord(value.review)) {
    addIssue(issues, "$.review", "must be an object");
  } else {
    if (typeof value.review.reviewedBy !== "string" || value.review.reviewedBy.length === 0) {
      addIssue(issues, "$.review.reviewedBy", "is required");
    }
    if (!isTimestamp(value.review.reviewedAt)) {
      addIssue(issues, "$.review.reviewedAt", "must be an ISO-8601 timestamp");
    }
    if (
      value.review.supersedesVersion !== null &&
      (typeof value.review.supersedesVersion !== "number" ||
        !Number.isInteger(value.review.supersedesVersion) ||
        value.review.supersedesVersion < 1)
    ) {
      addIssue(issues, "$.review.supersedesVersion", "must be null or a positive integer");
    }
  }

  if (
    isRecord(value.sourceInstrument) &&
    isRecord(value.targetInstrument) &&
    value.sourceInstrument.mint === value.targetInstrument.mint
  ) {
    addIssue(issues, "$.targetInstrument.mint", "must differ from the source mint");
  }

  return issues.length === 0
    ? { success: true, data: value as unknown as ActionManifest, issues: [] }
    : { success: false, issues };
}
