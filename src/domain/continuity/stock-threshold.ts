export type ReferenceCheckState = "FAIL" | "PASS";
export type ReferenceVerdict = "BLOCKED" | "READY" | "STALE";

export interface StockReferenceSnapshot {
  readonly confidenceMantissa: string;
  readonly exponent: number;
  readonly feedId: number;
  readonly feedUpdatedAt: string;
  readonly marketSession: string;
  readonly payloadTimestamp: string;
  readonly priceMantissa: string;
  readonly publisherCount: number;
  readonly symbol: string;
}

export interface ReferencePolicy {
  readonly expectedFeedId: number;
  readonly expectedSymbol: string;
  readonly maxAgeSeconds: number;
  readonly maxConfidenceBps: number;
  readonly minPublishers: number;
}

export interface ReferenceCheck {
  readonly key: "confidence" | "feed" | "freshness" | "price" | "publishers" | "session";
  readonly label: string;
  readonly state: ReferenceCheckState;
  readonly detail: string;
}

export interface ReferenceEvaluation {
  readonly ageSeconds: number;
  readonly checks: readonly ReferenceCheck[];
  readonly confidenceBps: number;
  readonly verdict: ReferenceVerdict;
}

export interface StockThresholdCalibration {
  readonly formula: string;
  readonly quoteAmount: string;
  readonly quoteBaseUnits: string;
  readonly quoteDecimals: number;
  readonly targetUsd: number;
}

export interface DecimalPrice {
  readonly exponent: number;
  readonly priceMantissa: string;
}

function parsePositiveInteger(value: string, field: string): bigint {
  if (!/^\d+$/.test(value)) throw new TypeError(`${field} must be an unsigned integer`);
  const parsed = BigInt(value);
  if (parsed <= 0n) throw new RangeError(`${field} must be greater than zero`);
  return parsed;
}

function pow10(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 30) {
    throw new RangeError("decimal exponent is outside the supported range");
  }
  return 10n ** BigInt(exponent);
}

function divideCeil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function formatMantissa(mantissa: string, exponent: number): string {
  const value = parsePositiveInteger(mantissa, "mantissa").toString();
  if (exponent >= 0) return `${value}${"0".repeat(exponent)}`;

  const decimalPlaces = Math.abs(exponent);
  const padded = value.padStart(decimalPlaces + 1, "0");
  const whole = padded.slice(0, -decimalPlaces);
  const fraction = padded.slice(-decimalPlaces).replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function formatBaseUnits(baseUnits: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError("decimals must be an integer from 0 to 18");
  }
  if (decimals === 0) return baseUnits.toString();

  const value = baseUnits.toString().padStart(decimals + 1, "0");
  const whole = value.slice(0, -decimals);
  const fraction = value.slice(-decimals).replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function calibrateStockThreshold(
  snapshot: DecimalPrice,
  options: { readonly quoteDecimals: number; readonly targetUsd: number },
): StockThresholdCalibration {
  if (!Number.isInteger(options.targetUsd) || options.targetUsd <= 0) {
    throw new RangeError("targetUsd must be a positive whole-dollar amount");
  }
  if (
    !Number.isInteger(options.quoteDecimals) ||
    options.quoteDecimals < 0 ||
    options.quoteDecimals > 18
  ) {
    throw new RangeError("quoteDecimals must be an integer from 0 to 18");
  }

  const price = parsePositiveInteger(snapshot.priceMantissa, "priceMantissa");
  let numerator = BigInt(options.targetUsd) * pow10(options.quoteDecimals);
  let denominator = price;

  if (snapshot.exponent < 0) {
    numerator *= pow10(Math.abs(snapshot.exponent));
  } else if (snapshot.exponent > 0) {
    denominator *= pow10(snapshot.exponent);
  }

  const quoteBaseUnits = divideCeil(numerator, denominator);
  return Object.freeze({
    formula: `ceil(${options.targetUsd} × 10^${options.quoteDecimals} ÷ (${snapshot.priceMantissa} × 10^${snapshot.exponent}))`,
    quoteAmount: formatBaseUnits(quoteBaseUnits, options.quoteDecimals),
    quoteBaseUnits: quoteBaseUnits.toString(),
    quoteDecimals: options.quoteDecimals,
    targetUsd: options.targetUsd,
  });
}

export function evaluateStockReference(
  snapshot: StockReferenceSnapshot,
  policy: ReferencePolicy,
  evaluatedAt: string,
): ReferenceEvaluation {
  const price = parsePositiveInteger(snapshot.priceMantissa, "priceMantissa");
  const confidence = BigInt(snapshot.confidenceMantissa);
  if (confidence < 0n) throw new RangeError("confidenceMantissa cannot be negative");

  const evaluatedAtMs = Date.parse(evaluatedAt);
  const feedUpdatedAtMs = Date.parse(snapshot.feedUpdatedAt);
  if (!Number.isFinite(evaluatedAtMs) || !Number.isFinite(feedUpdatedAtMs)) {
    throw new TypeError("reference timestamps must be ISO-8601 values");
  }

  const ageSeconds = Math.floor((evaluatedAtMs - feedUpdatedAtMs) / 1_000);
  const confidenceBps = Number(divideCeil(confidence * 10_000n, price));
  const feedPass =
    snapshot.feedId === policy.expectedFeedId &&
    snapshot.symbol === policy.expectedSymbol;
  const pricePass = price > 0n;
  const freshnessPass = ageSeconds >= -5 && ageSeconds <= policy.maxAgeSeconds;
  const confidencePass = confidenceBps <= policy.maxConfidenceBps;
  const publisherPass = snapshot.publisherCount >= policy.minPublishers;
  const sessionPass = snapshot.marketSession !== "closed";

  const checks: readonly ReferenceCheck[] = [
    {
      key: "feed",
      label: "Feed identity",
      state: feedPass ? "PASS" : "FAIL",
      detail: feedPass ? `Pyth Pro ${snapshot.feedId} · ${snapshot.symbol}` : "Unexpected feed identity",
    },
    {
      key: "price",
      label: "Reference price",
      state: pricePass ? "PASS" : "FAIL",
      detail: pricePass ? `$${formatMantissa(snapshot.priceMantissa, snapshot.exponent)}` : "Price is unavailable",
    },
    {
      key: "freshness",
      label: "Freshness",
      state: freshnessPass ? "PASS" : "FAIL",
      detail: freshnessPass ? `${Math.max(ageSeconds, 0)}s old` : `${ageSeconds}s old · limit ${policy.maxAgeSeconds}s`,
    },
    {
      key: "confidence",
      label: "Confidence",
      state: confidencePass ? "PASS" : "FAIL",
      detail: `${confidenceBps} bps · limit ${policy.maxConfidenceBps} bps`,
    },
    {
      key: "publishers",
      label: "Publishers",
      state: publisherPass ? "PASS" : "FAIL",
      detail: `${snapshot.publisherCount} publishers · minimum ${policy.minPublishers}`,
    },
    {
      key: "session",
      label: "Market session",
      state: sessionPass ? "PASS" : "FAIL",
      detail: snapshot.marketSession,
    },
  ];

  const verdict: ReferenceVerdict = !freshnessPass
    ? "STALE"
    : checks.some((check) => check.state === "FAIL")
      ? "BLOCKED"
      : "READY";

  return Object.freeze({
    ageSeconds,
    checks: Object.freeze(checks),
    confidenceBps,
    verdict,
  });
}
