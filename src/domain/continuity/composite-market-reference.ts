import {
  evaluateStockReference,
  type ReferenceCheckState,
  type ReferenceVerdict,
  type StockReferenceSnapshot,
} from "./stock-threshold.ts";

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;
export const SOL_USD_FEED_ID = 6;
export const SOL_USD_SYMBOL = "Crypto.SOL/USD";

export interface JupiterRouteLeg {
  readonly ammKey: string;
  readonly inputMint: string;
  readonly label: string;
  readonly outputMint: string;
}

export interface JupiterQuoteSnapshot {
  readonly contextSlot: number;
  readonly inputAmount: string;
  readonly inputMint: string;
  readonly outputAmount: string;
  readonly outputMint: string;
  readonly retrievedAt: string;
  readonly route: readonly JupiterRouteLeg[];
}

export interface JupiterReferenceObservation {
  readonly provenance: {
    readonly authenticated: boolean;
    readonly endpointHost: string;
    readonly retrievedAt: string;
    readonly source: "JUPITER_SWAP_QUOTE";
  };
  readonly solQuote: JupiterQuoteSnapshot;
  readonly usdQuote: JupiterQuoteSnapshot;
}

export interface CompositeReferenceCheck {
  readonly detail: string;
  readonly key:
    | "divergence"
    | "jupiter_sol_freshness"
    | "jupiter_usd_freshness"
    | "pyth_confidence"
    | "pyth_feed"
    | "pyth_freshness"
    | "pyth_price"
    | "pyth_publishers"
    | "pyth_session";
  readonly label: string;
  readonly state: ReferenceCheckState;
}

export interface CompositeMarketReference {
  readonly evaluation: {
    readonly checks: readonly CompositeReferenceCheck[];
    readonly deviationBps: number;
    readonly pythAgeSeconds: number;
    readonly pythConfidenceBps: number;
    readonly verdict: ReferenceVerdict;
  };
  readonly provenance: {
    readonly jupiter: JupiterReferenceObservation["provenance"];
    readonly pyth: PythReferenceProvenance;
    readonly source: "JUPITER_PYTH_COMPOSITE";
  };
  readonly snapshot: {
    readonly directUsdPrice: DecimalPricePoint;
    readonly pythSolUsd: StockReferenceSnapshot;
    readonly selectedPrice: DecimalPricePoint & {
      readonly source: "JUPITER_USDC_EXECUTABLE" | "PYTH_SOL_CROSS";
      readonly symbol: "SPCXx/USD";
    };
    readonly solCrossUsdPrice: DecimalPricePoint;
    readonly solQuote: JupiterQuoteSnapshot;
    readonly usdQuote: JupiterQuoteSnapshot;
  };
}

export interface PythReferenceProvenance {
  readonly authenticated: boolean;
  readonly channel: "fixed_rate@200ms";
  readonly endpointHost: string;
  readonly retrievedAt: string;
  readonly source: "DEMO_FIXTURE" | "PYTH_PRO_REST";
}

interface DecimalPricePoint {
  readonly exponent: number;
  readonly priceMantissa: string;
}

interface BuildCompositeMarketReferenceOptions {
  readonly evaluatedAt: string;
  readonly jupiter: JupiterReferenceObservation;
  readonly pyth: {
    readonly provenance: PythReferenceProvenance;
    readonly snapshot: StockReferenceSnapshot;
  };
}

function positiveInteger(value: string, field: string): bigint {
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return BigInt(value);
}

function pow10(value: number): bigint {
  if (!Number.isInteger(value) || value < 0 || value > 30) {
    throw new RangeError("decimal exponent is outside the supported range");
  }
  return 10n ** BigInt(value);
}

function normalize(priceMantissa: bigint, exponent: number): DecimalPricePoint {
  let value = priceMantissa;
  let normalizedExponent = exponent;
  while (value % 10n === 0n) {
    value /= 10n;
    normalizedExponent += 1;
  }
  return Object.freeze({
    exponent: normalizedExponent,
    priceMantissa: value.toString(),
  });
}

function alignPrices(left: DecimalPricePoint, right: DecimalPricePoint) {
  const exponent = Math.min(left.exponent, right.exponent);
  return {
    exponent,
    left: positiveInteger(left.priceMantissa, "left price") * pow10(left.exponent - exponent),
    right: positiveInteger(right.priceMantissa, "right price") * pow10(right.exponent - exponent),
  };
}

function ageSeconds(timestamp: string, evaluatedAt: string): number {
  const timestampMs = Date.parse(timestamp);
  const evaluatedAtMs = Date.parse(evaluatedAt);
  if (!Number.isFinite(timestampMs) || !Number.isFinite(evaluatedAtMs)) {
    throw new TypeError("reference timestamps must be ISO-8601 values");
  }
  return Math.floor((evaluatedAtMs - timestampMs) / 1_000);
}

export function buildCompositeMarketReference(
  options: BuildCompositeMarketReferenceOptions,
): CompositeMarketReference {
  const directUsdPrice = normalize(
    positiveInteger(options.jupiter.usdQuote.outputAmount, "USDC output amount"),
    -USDC_DECIMALS,
  );
  const solCrossUsdPrice = normalize(
    positiveInteger(options.jupiter.solQuote.outputAmount, "SOL output amount") *
      positiveInteger(options.pyth.snapshot.priceMantissa, "Pyth SOL/USD price"),
    options.pyth.snapshot.exponent - SOL_DECIMALS,
  );
  const aligned = alignPrices(directUsdPrice, solCrossUsdPrice);
  const lower = aligned.left <= aligned.right ? aligned.left : aligned.right;
  const higher = aligned.left <= aligned.right ? aligned.right : aligned.left;
  const deviationBps = Number(((higher - lower) * 10_000n + lower - 1n) / lower);
  const selectedPrice = Object.freeze({
    ...(aligned.left <= aligned.right ? directUsdPrice : solCrossUsdPrice),
    source: aligned.left <= aligned.right
      ? "JUPITER_USDC_EXECUTABLE" as const
      : "PYTH_SOL_CROSS" as const,
    symbol: "SPCXx/USD" as const,
  });

  const pythEvaluation = evaluateStockReference(
    options.pyth.snapshot,
    {
      expectedFeedId: SOL_USD_FEED_ID,
      expectedSymbol: SOL_USD_SYMBOL,
      maxAgeSeconds: 60,
      maxConfidenceBps: 100,
      minPublishers: 3,
    },
    options.evaluatedAt,
  );
  const usdAge = ageSeconds(options.jupiter.usdQuote.retrievedAt, options.evaluatedAt);
  const solAge = ageSeconds(options.jupiter.solQuote.retrievedAt, options.evaluatedAt);
  const quoteFresh = (age: number) => age >= -5 && age <= 30;
  const mappedPythChecks = pythEvaluation.checks.map((check) => ({
    ...check,
    key: `pyth_${check.key}` as CompositeReferenceCheck["key"],
    label: `Pyth ${check.label.toLowerCase()}`,
  }));
  const checks: readonly CompositeReferenceCheck[] = Object.freeze([
    {
      detail: quoteFresh(usdAge) ? `${Math.max(usdAge, 0)}s old` : `${usdAge}s old · limit 30s`,
      key: "jupiter_usd_freshness",
      label: "USDC route freshness",
      state: quoteFresh(usdAge) ? "PASS" : "FAIL",
    },
    {
      detail: quoteFresh(solAge) ? `${Math.max(solAge, 0)}s old` : `${solAge}s old · limit 30s`,
      key: "jupiter_sol_freshness",
      label: "SOL route freshness",
      state: quoteFresh(solAge) ? "PASS" : "FAIL",
    },
    ...mappedPythChecks,
    {
      detail: `${deviationBps} bps · limit 100 bps`,
      key: "divergence",
      label: "Route divergence",
      state: deviationBps <= 100 ? "PASS" : "FAIL",
    },
  ]);
  const stale = !quoteFresh(usdAge) || !quoteFresh(solAge) || pythEvaluation.verdict === "STALE";
  const verdict: ReferenceVerdict = stale
    ? "STALE"
    : checks.some((check) => check.state === "FAIL")
      ? "BLOCKED"
      : "READY";

  return Object.freeze({
    evaluation: Object.freeze({
      checks,
      deviationBps,
      pythAgeSeconds: pythEvaluation.ageSeconds,
      pythConfidenceBps: pythEvaluation.confidenceBps,
      verdict,
    }),
    provenance: Object.freeze({
      jupiter: options.jupiter.provenance,
      pyth: options.pyth.provenance,
      source: "JUPITER_PYTH_COMPOSITE" as const,
    }),
    snapshot: Object.freeze({
      directUsdPrice,
      pythSolUsd: options.pyth.snapshot,
      selectedPrice,
      solCrossUsdPrice,
      solQuote: options.jupiter.solQuote,
      usdQuote: options.jupiter.usdQuote,
    }),
  });
}
