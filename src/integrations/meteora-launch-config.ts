import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DammV2DynamicFeeMode,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  buildCurve,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import {
  buildCompositeMarketReference,
  type CompositeMarketReference,
} from "../domain/continuity/composite-market-reference.ts";
import {
  calibrateStockThreshold,
  type StockThresholdCalibration,
} from "../domain/continuity/stock-threshold.ts";
import {
  buildStockAwareDbcPolicy,
  type StockAwareDbcPolicy,
} from "../domain/continuity/stock-aware-dbc-policy.ts";
import { SPCXX_MINT } from "./meteora-dbc.ts";
import { USDC_MINT, WRAPPED_SOL_MINT } from "./jupiter-quote.ts";

const CONT_TARGET_SUPPLY = 1_000_000_000;
const QUOTE_DECIMALS = 8;
const TARGET_USD = 1_000;

export interface MeteoraLaunchReview {
  readonly calibration: StockThresholdCalibration;
  readonly configuration: {
    readonly design: {
      readonly activation: "TIMESTAMP";
      readonly authority: "IMMUTABLE";
      readonly baseDecimals: 6;
      readonly baseSymbol: string;
      readonly baseTokenProgram: "SPL_TOKEN";
      readonly bondingFee: {
        readonly durationSeconds: 900;
        readonly endingBps: 25;
        readonly periods: 15;
        readonly startingBps: 100;
      };
      readonly collectFeeIn: "QUOTE_TOKEN";
      readonly dynamicFee: true;
      readonly firstSwapException: false;
      readonly liquidityLock: {
        readonly creatorPermanentPercent: 50;
        readonly partnerPermanentPercent: 50;
      };
      readonly migration: "DAMM_V2";
      readonly migrationFeePercent: 0;
      readonly migratedPoolFeeBps: 30;
      readonly percentageSupplyOnMigration: 20;
      readonly poolCreationFeeSol: 0;
      readonly quoteMint: string;
      readonly quoteSymbol: string;
      readonly targetSupply: number;
    };
    readonly hash: string;
    readonly sdk: {
      readonly curve: readonly {
        readonly liquidity: string;
        readonly sqrtPrice: string;
      }[];
      readonly migrationQuoteThreshold: string;
      readonly sdkPackage: "@meteora-ag/dynamic-bonding-curve-sdk@1.5.13";
      readonly sqrtStartPrice: string;
      readonly tokenSupplyBaseUnits: string;
    };
    readonly status: "DRAFT_UNSIGNED";
  };
  readonly reference: {
    readonly evaluation: CompositeMarketReference["evaluation"];
    readonly mode: "DEMO_FIXTURE" | "LIVE_COMPOSITE";
    readonly provenance: CompositeMarketReference["provenance"];
    readonly snapshot: CompositeMarketReference["snapshot"];
  };
  readonly policy: StockAwareDbcPolicy;
  readonly reviewState: "BLOCKED" | "READY_FOR_REVIEW";
  readonly signing: {
    readonly enabled: false;
    readonly reasons: readonly string[];
  };
}

interface BuildLaunchReviewOptions {
  readonly baseSymbol?: string;
  readonly mode: MeteoraLaunchReview["reference"]["mode"];
  readonly observation: CompositeMarketReference;
  readonly targetSupply?: number;
}

export function buildStockQuotedDesign(options: {
  readonly baseSymbol: string;
  readonly targetSupply: number;
}) {
  return {
    activation: "TIMESTAMP",
    authority: "IMMUTABLE",
    baseDecimals: 6,
    baseSymbol: options.baseSymbol,
    baseTokenProgram: "SPL_TOKEN",
    bondingFee: {
      durationSeconds: 900,
      endingBps: 25,
      periods: 15,
      startingBps: 100,
    },
    collectFeeIn: "QUOTE_TOKEN",
    dynamicFee: true,
    firstSwapException: false,
    liquidityLock: {
      creatorPermanentPercent: 50,
      partnerPermanentPercent: 50,
    },
    migration: "DAMM_V2",
    migrationFeePercent: 0,
    migratedPoolFeeBps: 30,
    percentageSupplyOnMigration: 20,
    poolCreationFeeSol: 0,
    quoteMint: SPCXX_MINT,
    quoteSymbol: "SPCXx",
    targetSupply: options.targetSupply,
  } as const;
}

export function buildContSpcxxDesign() {
  return buildStockQuotedDesign({
    baseSymbol: "CONT",
    targetSupply: CONT_TARGET_SUPPLY,
  });
}

export function buildStockQuotedSdkConfig(
  calibration: StockThresholdCalibration,
  design: MeteoraLaunchReview["configuration"]["design"],
): ConfigParameters {
  return buildCurve({
    activationType: ActivationType.Timestamp,
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          endingFeeBps: design.bondingFee.endingBps,
          numberOfPeriod: design.bondingFee.periods,
          startingFeeBps: design.bondingFee.startingBps,
          totalDuration: design.bondingFee.durationSeconds,
        },
      },
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 0,
      dynamicFeeEnabled: design.dynamicFee,
      enableFirstSwapWithMinFee: design.firstSwapException,
      poolCreationFee: design.poolCreationFeeSol,
    },
    liquidityDistribution: {
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage:
        design.liquidityLock.creatorPermanentPercent,
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage:
        design.liquidityLock.partnerPermanentPercent,
    },
    lockedVesting: {
      cliffDurationFromMigrationTime: 0,
      cliffUnlockAmount: 0,
      numberOfVestingPeriod: 0,
      totalLockedVestingAmount: 0,
      totalVestingDuration: 0,
    },
    migration: {
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        poolFeeBps: design.migratedPoolFeeBps,
      },
      migrationFee: { creatorFeePercentage: 0, feePercentage: 0 },
      migrationFeeOption: MigrationFeeOption.FixedBps30,
      migrationOption: MigrationOption.MET_DAMM_V2,
    },
    migrationQuoteThreshold: Number(calibration.quoteAmount),
    percentageSupplyOnMigration: design.percentageSupplyOnMigration,
    token: {
      leftover: 0,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: QUOTE_DECIMALS,
      tokenType: TokenType.SPLToken,
      totalTokenSupply: design.targetSupply,
    },
  });
}

export function buildContSpcxxSdkConfig(
  calibration: StockThresholdCalibration,
): ConfigParameters {
  return buildStockQuotedSdkConfig(calibration, buildContSpcxxDesign());
}

export async function buildStockQuotedLaunchReview(
  options: BuildLaunchReviewOptions,
): Promise<MeteoraLaunchReview> {
  const referenceEvaluation = options.observation.evaluation;
  const calibration = calibrateStockThreshold(options.observation.snapshot.selectedPrice, {
    quoteDecimals: QUOTE_DECIMALS,
    targetUsd: TARGET_USD,
  });
  const design = buildStockQuotedDesign({
    baseSymbol: options.baseSymbol ?? "CONT",
    targetSupply: options.targetSupply ?? CONT_TARGET_SUPPLY,
  });
  const policy = buildStockAwareDbcPolicy();
  const config = buildStockQuotedSdkConfig(calibration, design);

  const sdk = {
    curve: config.curve.map((point: { liquidity: { toString(): string }; sqrtPrice: { toString(): string } }) => ({
      liquidity: point.liquidity.toString(),
      sqrtPrice: point.sqrtPrice.toString(),
    })),
    migrationQuoteThreshold: config.migrationQuoteThreshold.toString(),
    sdkPackage: "@meteora-ag/dynamic-bonding-curve-sdk@1.5.13",
    sqrtStartPrice: config.sqrtStartPrice.toString(),
    tokenSupplyBaseUnits: config.tokenSupply.preMigrationTokenSupply.toString(),
  } as const;

  if (sdk.migrationQuoteThreshold !== calibration.quoteBaseUnits) {
    throw new Error("Meteora SDK threshold differs from the exact calibration.");
  }

  const hash = await canonicalSha256({
    calibration,
    design,
    policy,
    reference: options.observation,
    schemaVersion: 2,
    sdk,
  });
  const referenceReady = referenceEvaluation.verdict === "READY";

  return Object.freeze({
    calibration,
    configuration: Object.freeze({
      design,
      hash,
      sdk: Object.freeze(sdk),
      status: "DRAFT_UNSIGNED" as const,
    }),
    reference: Object.freeze({
      evaluation: referenceEvaluation,
      mode: options.mode,
      provenance: options.observation.provenance,
      snapshot: options.observation.snapshot,
    }),
    policy,
    reviewState: referenceReady ? "READY_FOR_REVIEW" : "BLOCKED",
    signing: Object.freeze({
      enabled: false as const,
      reasons: Object.freeze([
        ...(referenceReady ? [] : ["Composite market-reference policy has not passed"]),
        "ClawPump authority mapping is not verified",
        "Transaction has not been built or simulated",
        "Human launch approval is required",
      ]),
    }),
  });
}

export async function buildContSpcxxLaunchReview(
  options: BuildLaunchReviewOptions,
): Promise<MeteoraLaunchReview> {
  return buildStockQuotedLaunchReview({
    ...options,
    baseSymbol: "CONT",
    targetSupply: CONT_TARGET_SUPPLY,
  });
}

export async function buildDemoLaunchReview(): Promise<MeteoraLaunchReview> {
  const retrievedAt = "2026-09-24T13:45:33.935Z";
  const observation = buildCompositeMarketReference({
    evaluatedAt: "2026-09-24T13:45:34.329Z",
    jupiter: {
      provenance: {
        authenticated: false,
        endpointHost: "lite-api.jup.ag",
        retrievedAt,
        source: "JUPITER_SWAP_QUOTE",
      },
      solQuote: {
        contextSlot: 450046343,
        inputAmount: "100000000",
        inputMint: SPCXX_MINT,
        outputAmount: "1281880000",
        outputMint: WRAPPED_SOL_MINT,
        retrievedAt: "2026-09-24T13:45:33.911Z",
        route: [{
          ammKey: "8a1ozhQR5EMmbkDRwvpPCTQCwHouS5mRmGBr7PcDokUa",
          inputMint: SPCXX_MINT,
          label: "Scorch",
          outputMint: WRAPPED_SOL_MINT,
        }],
      },
      usdQuote: {
        contextSlot: 450046343,
        inputAmount: "100000000",
        inputMint: SPCXX_MINT,
        outputAmount: "147137185",
        outputMint: USDC_MINT,
        retrievedAt,
        route: [{
          ammKey: "ASAxmEaTT1HFe3mVC3zbKDE4tuB28W7732XQrEMBM5W2",
          inputMint: SPCXX_MINT,
          label: "Whirlpool",
          outputMint: USDC_MINT,
        }],
      },
    },
    pyth: {
      provenance: {
        authenticated: false,
        channel: "fixed_rate@200ms",
        endpointHost: "fixture.local",
        retrievedAt: "2026-09-24T13:45:34.329Z",
        source: "DEMO_FIXTURE",
      },
      snapshot: {
        confidenceMantissa: "1640100",
        exponent: -8,
        feedId: 6,
        feedUpdatedAt: "2026-09-24T13:45:34.200Z",
        marketSession: "regular",
        payloadTimestamp: "2026-09-24T13:45:34.200Z",
        priceMantissa: "11468359902",
        publisherCount: 18,
        symbol: "Crypto.SOL/USD",
      },
    },
  });
  return buildContSpcxxLaunchReview({
    mode: "DEMO_FIXTURE",
    observation,
  });
}
