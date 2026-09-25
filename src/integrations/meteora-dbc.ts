import {
  DYNAMIC_BONDING_CURVE_PROGRAM_ID,
  DynamicBondingCurveClient,
  deriveTokenBadgeAddress,
  feeNumeratorToBps,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SolanaCluster } from "../config/server-environment.ts";
import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import {
  evaluateDbcAttestation,
  type DbcAttestationEvaluation,
  type DbcAttestationInput,
} from "../domain/continuity/dbc-attestation.ts";
import { IntegrationError } from "./integration-error.ts";
import { SolanaRpcAdapter } from "./solana-rpc.ts";

export const SPCXX_MINT = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

interface MeteoraDbcAdapterOptions {
  readonly cluster: SolanaCluster;
  readonly configAddress: string | null;
  readonly poolAddress: string | null;
  readonly rpcUrl: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
}

export interface MeteoraDbcObservation {
  readonly addresses: {
    readonly badge: string;
    readonly config: string | null;
    readonly pool: string | null;
    readonly program: string;
    readonly quoteDecimals: number;
    readonly quoteMint: string;
  };
  readonly attestation: DbcAttestationEvaluation;
  readonly market: null | {
    readonly baseReserve: string;
    readonly baseMint: string;
    readonly configAddress: string;
    readonly feeConfigurationHash: string;
    readonly openingFeeBps: number;
    readonly curveProgress: number;
    readonly isMigrated: boolean;
    readonly migrationProgress: number;
    readonly quoteReserve: string;
    readonly quoteMint: string;
  };
  readonly provenance: {
    readonly cluster: SolanaCluster;
    readonly commitment: "confirmed";
    readonly endpointHost: string;
    readonly observedAt: string;
    readonly slot: number;
    readonly source: "METEORA_DBC_SDK";
  };
}

export interface MeteoraPartnerTreasuryObservation {
  readonly assets: {
    readonly base: {
      readonly claimed: string;
      readonly decimals: number;
      readonly mint: string;
      readonly total: string;
      readonly unclaimed: string;
    };
    readonly quote: {
      readonly claimed: string;
      readonly decimals: number;
      readonly mint: string;
      readonly total: string;
      readonly unclaimed: string;
    };
  };
  readonly authority: {
    readonly feeClaimer: string;
  };
  readonly observedAt: string;
  readonly poolAddress: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          "Meteora DBC read timed out.",
          { retryable: true, status: 503 },
        ),
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function isDynamicFeeEnabled(binStep: unknown): boolean {
  if (typeof binStep === "number") return Number.isFinite(binStep) && binStep !== 0;
  if (typeof binStep === "bigint") return binStep !== 0n;
  if (
    typeof binStep === "object" &&
    binStep !== null &&
    "isZero" in binStep &&
    typeof binStep.isZero === "function"
  ) {
    return !binStep.isZero();
  }
  return false;
}

export class MeteoraDbcAdapter {
  readonly #cluster: SolanaCluster;
  readonly #configAddress: string | null;
  readonly #endpointHost: string;
  readonly #mintReader: SolanaRpcAdapter;
  readonly #now: () => Date;
  readonly #poolAddress: string | null;
  readonly #state: DynamicBondingCurveClient["state"];
  readonly #timeoutMs: number;

  constructor(options: MeteoraDbcAdapterOptions) {
    const connection = new Connection(options.rpcUrl, "confirmed");
    const client = DynamicBondingCurveClient.create(connection, "confirmed");

    this.#cluster = options.cluster;
    this.#configAddress = options.configAddress;
    this.#endpointHost = new URL(options.rpcUrl).host;
    this.#mintReader = new SolanaRpcAdapter({
      cluster: options.cluster,
      rpcUrl: options.rpcUrl,
      timeoutMs: options.timeoutMs,
      now: options.now,
    });
    this.#now = options.now ?? (() => new Date());
    this.#poolAddress = options.poolAddress;
    this.#state = client.state;
    this.#timeoutMs = options.timeoutMs ?? 7_000;
  }

  async attestSpcxxQuoteRail(): Promise<MeteoraDbcObservation> {
    return this.attestQuoteRail(SPCXX_MINT);
  }

  /** Reads earned partner fees without building a claim or requesting a signature. */
  async readPartnerTreasury(): Promise<MeteoraPartnerTreasuryObservation> {
    if (this.#poolAddress === null) {
      throw new IntegrationError(
        "CONFIG_REQUIRED",
        "A protected market pool is required for treasury reads.",
        { retryable: false, status: 400 },
      );
    }

    try {
      const pool = await withTimeout(
        this.#state.getPool(this.#poolAddress),
        this.#timeoutMs,
      );
      if (pool === null) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          "The protected Meteora pool could not be found.",
          { retryable: true, status: 503 },
        );
      }
      const configAddress = pool.poolState.config.toBase58();
      const config = await withTimeout(
        this.#state.getPoolConfig(configAddress),
        this.#timeoutMs,
      );
      if (config === null) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          "The protected Meteora configuration could not be found.",
          { retryable: true, status: 503 },
        );
      }
      const baseMint = pool.poolState.baseMint.toBase58();
      const quoteMint = config.quoteMint.toBase58();
      const [fees, base, quote] = await withTimeout(
        Promise.all([
          this.#state.getPoolFeeBreakdown(this.#poolAddress),
          this.#mintReader.getMint(baseMint),
          this.#mintReader.getMint(quoteMint),
        ]),
        this.#timeoutMs,
      );

      return Object.freeze({
        assets: Object.freeze({
          base: Object.freeze({
            claimed: fees.partner.claimedBaseFee.toString(),
            decimals: base.instrument.decimals,
            mint: baseMint,
            total: fees.partner.totalBaseFee.toString(),
            unclaimed: fees.partner.unclaimedBaseFee.toString(),
          }),
          quote: Object.freeze({
            claimed: fees.partner.claimedQuoteFee.toString(),
            decimals: quote.instrument.decimals,
            mint: quoteMint,
            total: fees.partner.totalQuoteFee.toString(),
            unclaimed: fees.partner.unclaimedQuoteFee.toString(),
          }),
        }),
        authority: Object.freeze({
          feeClaimer: config.feeClaimer.toBase58(),
        }),
        observedAt: this.#now().toISOString(),
        poolAddress: this.#poolAddress,
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "Meteora partner fees could not be read from the configured RPC.",
        { retryable: true, status: 503 },
      );
    }
  }

  async attestQuoteRail(quoteMintAddress: string): Promise<MeteoraDbcObservation> {
    const quoteMint = new PublicKey(quoteMintAddress);
    const badgeAddress = deriveTokenBadgeAddress(quoteMint).toBase58();

    try {
      const [mint, badge, config, pool] = await withTimeout(
        Promise.all([
          this.#mintReader.getMint(quoteMintAddress),
          this.#state.getTokenBadge(quoteMint),
          this.#configAddress === null
            ? Promise.resolve(null)
            : this.#state.getPoolConfig(this.#configAddress),
          this.#poolAddress === null
            ? Promise.resolve(null)
            : this.#state.getPool(this.#poolAddress),
        ]),
        this.#timeoutMs,
      );

      const configuredConfig =
        this.#configAddress === null
          ? null
          : {
              address: this.#configAddress,
              found: config !== null,
              quoteMint: config?.quoteMint.toBase58() ?? null,
            };
      const configuredPool =
        this.#poolAddress === null
          ? null
          : {
              address: this.#poolAddress,
              configAddress: pool?.poolState.config.toBase58() ?? null,
              found: pool !== null,
              quoteMint: config?.quoteMint.toBase58() ?? null,
            };

      const input: DbcAttestationInput = {
        expected: {
          badgeAddress,
          quoteMint: quoteMintAddress,
          tokenProgram: TOKEN_2022_PROGRAM,
        },
        observed: {
          badge:
            badge === null
              ? null
              : {
                  address: badgeAddress,
                  tokenMint: badge.tokenMint.toBase58(),
                },
          config: configuredConfig,
          mint: {
            address: mint.instrument.mint,
            extensions: mint.instrument.extensions,
            tokenProgram: mint.instrument.tokenProgram,
          },
          pool: configuredPool,
        },
      };

      let market: MeteoraDbcObservation["market"] = null;
      if (pool !== null && config !== null) {
        const curveProgress = await withTimeout(
          this.#state.getPoolQuoteTokenCurveProgress(this.#poolAddress!),
          this.#timeoutMs,
        );
        const feeConfiguration = {
          activationType: config.activationType,
          baseFeeMode: config.poolFees.baseFee.baseFeeMode,
          cliffFeeNumerator: config.poolFees.baseFee.cliffFeeNumerator.toString(),
          collectFeeMode: config.collectFeeMode,
          dynamicFeeEnabled: isDynamicFeeEnabled(config.poolFees.dynamicFee.binStep),
          migratedPoolFeeBps: config.migratedPoolFeeBps,
          migrationOption: config.migrationOption,
          migrationQuoteThreshold: config.migrationQuoteThreshold.toString(),
        };
        market = Object.freeze({
          baseReserve: pool.poolState.baseReserve.toString(),
          baseMint: pool.poolState.baseMint.toBase58(),
          configAddress: pool.poolState.config.toBase58(),
          curveProgress,
          feeConfigurationHash: await canonicalSha256(feeConfiguration),
          isMigrated: pool.poolState.isMigrated !== 0,
          migrationProgress: pool.poolState.migrationProgress,
          openingFeeBps: feeNumeratorToBps(
            config.poolFees.baseFee.cliffFeeNumerator,
          ),
          quoteReserve: pool.poolState.quoteReserve.toString(),
          quoteMint: config.quoteMint.toBase58(),
        });
      }

      return Object.freeze({
        addresses: Object.freeze({
          badge: badgeAddress,
          config: this.#configAddress,
          pool: this.#poolAddress,
          program: DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(),
          quoteDecimals: mint.instrument.decimals,
          quoteMint: quoteMintAddress,
        }),
        attestation: evaluateDbcAttestation(input),
        market,
        provenance: Object.freeze({
          cluster: this.#cluster,
          commitment: "confirmed",
          endpointHost: this.#endpointHost,
          observedAt: this.#now().toISOString(),
          slot: mint.provenance.slot,
          source: "METEORA_DBC_SDK",
        }),
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "Meteora DBC state could not be decoded from the configured RPC.",
        { retryable: true, status: 503 },
      );
    }
  }
}
