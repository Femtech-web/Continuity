import {
  DYNAMIC_BONDING_CURVE_PROGRAM_ID,
  DynamicBondingCurveClient,
  deriveTokenBadgeAddress,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import type { SolanaCluster } from "../config/server-environment.ts";
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
    readonly quoteMint: string;
  };
  readonly attestation: DbcAttestationEvaluation;
  readonly market: null | {
    readonly baseMint: string;
    readonly configAddress: string;
    readonly curveProgress: number;
    readonly isMigrated: boolean;
    readonly migrationProgress: number;
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
    const quoteMint = new PublicKey(SPCXX_MINT);
    const badgeAddress = deriveTokenBadgeAddress(quoteMint).toBase58();

    try {
      const [mint, badge, config, pool] = await withTimeout(
        Promise.all([
          this.#mintReader.getMint(SPCXX_MINT),
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
          quoteMint: SPCXX_MINT,
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
        market = Object.freeze({
          baseMint: pool.poolState.baseMint.toBase58(),
          configAddress: pool.poolState.config.toBase58(),
          curveProgress,
          isMigrated: pool.poolState.isMigrated !== 0,
          migrationProgress: pool.poolState.migrationProgress,
          quoteMint: config.quoteMint.toBase58(),
        });
      }

      return Object.freeze({
        addresses: Object.freeze({
          badge: badgeAddress,
          config: this.#configAddress,
          pool: this.#poolAddress,
          program: DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(),
          quoteMint: SPCXX_MINT,
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
