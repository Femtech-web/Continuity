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
  calibrateStockThreshold,
  evaluateStockReference,
  type ReferenceEvaluation,
  type StockReferenceSnapshot,
  type StockThresholdCalibration,
} from "../domain/continuity/stock-threshold.ts";
import { SPCXX_MINT } from "./meteora-dbc.ts";
import type { PythReferenceObservation } from "./pyth-pro.ts";

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
      readonly baseSymbol: "CONT";
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
      readonly quoteSymbol: "SPCXx";
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
    readonly evaluation: ReferenceEvaluation;
    readonly mode: "DEMO_FIXTURE" | "LIVE_PYTH_PRO";
    readonly provenance: PythReferenceObservation["provenance"] | {
      readonly authenticated: false;
      readonly channel: "fixed_rate@200ms";
      readonly endpointHost: "fixture.local";
      readonly retrievedAt: string;
      readonly source: "DEMO_FIXTURE";
    };
    readonly snapshot: StockReferenceSnapshot;
  };
  readonly reviewState: "BLOCKED" | "READY_FOR_REVIEW";
  readonly signing: {
    readonly enabled: false;
    readonly reasons: readonly string[];
  };
}

interface BuildLaunchReviewOptions {
  readonly evaluatedAt: string;
  readonly mode: MeteoraLaunchReview["reference"]["mode"];
  readonly observation: {
    readonly provenance: MeteoraLaunchReview["reference"]["provenance"];
    readonly snapshot: StockReferenceSnapshot;
  };
}

export function buildContSpcxxDesign() {
  return {
    activation: "TIMESTAMP",
    authority: "IMMUTABLE",
    baseDecimals: 6,
    baseSymbol: "CONT",
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
    targetSupply: CONT_TARGET_SUPPLY,
  } as const;
}

export function buildContSpcxxSdkConfig(
  calibration: StockThresholdCalibration,
): ConfigParameters {
  const design = buildContSpcxxDesign();

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

export async function buildContSpcxxLaunchReview(
  options: BuildLaunchReviewOptions,
): Promise<MeteoraLaunchReview> {
  const referenceEvaluation = evaluateStockReference(
    options.observation.snapshot,
    {
      expectedFeedId: 3329,
      expectedSymbol: "Crypto.SPCXX/USD",
      maxAgeSeconds: 60,
      maxConfidenceBps: 100,
      minPublishers: 3,
    },
    options.evaluatedAt,
  );
  const calibration = calibrateStockThreshold(options.observation.snapshot, {
    quoteDecimals: QUOTE_DECIMALS,
    targetUsd: TARGET_USD,
  });
  const design = buildContSpcxxDesign();
  const config = buildContSpcxxSdkConfig(calibration);

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
    reference: options.observation.snapshot,
    schemaVersion: 1,
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
    reviewState: referenceReady ? "READY_FOR_REVIEW" : "BLOCKED",
    signing: Object.freeze({
      enabled: false as const,
      reasons: Object.freeze([
        ...(referenceReady ? [] : ["Pyth reference policy has not passed"]),
        "ClawPump authority mapping is not verified",
        "Transaction has not been built or simulated",
        "Human launch approval is required",
      ]),
    }),
  });
}

export async function buildDemoLaunchReview(): Promise<MeteoraLaunchReview> {
  const retrievedAt = "2026-09-24T09:41:09.000Z";
  return buildContSpcxxLaunchReview({
    evaluatedAt: retrievedAt,
    mode: "DEMO_FIXTURE",
    observation: {
      provenance: {
        authenticated: false,
        channel: "fixed_rate@200ms",
        endpointHost: "fixture.local",
        retrievedAt,
        source: "DEMO_FIXTURE",
      },
      snapshot: {
        confidenceMantissa: "22000000",
        exponent: -8,
        feedId: 3329,
        feedUpdatedAt: "2026-09-24T09:41:05.000Z",
        marketSession: "regular",
        payloadTimestamp: "2026-09-24T09:41:05.100Z",
        priceMantissa: "23810000000",
        publisherCount: 4,
        symbol: "Crypto.SPCXX/USD",
      },
    },
  });
}
