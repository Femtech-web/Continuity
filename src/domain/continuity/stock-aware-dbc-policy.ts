export interface StockAwareDbcPolicy {
  readonly profile: "EQUITY_CONTINUITY_V1";
  readonly priceDiscovery: {
    readonly curve: "SINGLE_SEGMENT";
    readonly dynamicFee: true;
    readonly openingFeeBps: 100;
    readonly settledFeeBps: 25;
    readonly settlementWindowSeconds: 900;
  };
  readonly graduation: {
    readonly calibration: "LIVE_EXECUTABLE_COMPOSITE";
    readonly targetUsd: 1000;
    readonly thresholdRounding: "UP";
  };
  readonly lifecycle: {
    readonly quoteIdentity: "EXACT_MINT";
    readonly replacement: "NEW_CONFIG_NOT_POOL_MUTATION";
    readonly successorTerms: "SOURCE_BACKED_ONLY";
  };
  readonly monitoring: {
    readonly curveProgress: true;
    readonly migrationState: true;
    readonly quoteReference: true;
    readonly referenceFreshnessSeconds: 30;
  };
}

export function buildStockAwareDbcPolicy(): StockAwareDbcPolicy {
  return Object.freeze({
    profile: "EQUITY_CONTINUITY_V1" as const,
    priceDiscovery: Object.freeze({
      curve: "SINGLE_SEGMENT" as const,
      dynamicFee: true as const,
      openingFeeBps: 100 as const,
      settledFeeBps: 25 as const,
      settlementWindowSeconds: 900 as const,
    }),
    graduation: Object.freeze({
      calibration: "LIVE_EXECUTABLE_COMPOSITE" as const,
      targetUsd: 1000 as const,
      thresholdRounding: "UP" as const,
    }),
    lifecycle: Object.freeze({
      quoteIdentity: "EXACT_MINT" as const,
      replacement: "NEW_CONFIG_NOT_POOL_MUTATION" as const,
      successorTerms: "SOURCE_BACKED_ONLY" as const,
    }),
    monitoring: Object.freeze({
      curveProgress: true as const,
      migrationState: true as const,
      quoteReference: true as const,
      referenceFreshnessSeconds: 30 as const,
    }),
  });
}
