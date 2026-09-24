import { address } from "@solana/kit";
import type { SolanaCluster } from "../config/server-environment.ts";
import { IntegrationError } from "./integration-error.ts";

interface SolanaRpcAdapterOptions {
  readonly cluster: SolanaCluster;
  readonly rpcUrl: string;
  readonly timeoutMs?: number;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
}

interface JsonRpcEnvelope<T> {
  readonly jsonrpc?: string;
  readonly result?: T;
  readonly error?: {
    readonly code?: number;
    readonly message?: string;
  };
}

interface AccountInfoResult {
  readonly context: { readonly slot: number };
  readonly value: null | {
    readonly data: unknown;
    readonly executable: boolean;
    readonly lamports: number;
    readonly owner: string;
    readonly space: number;
  };
}

interface ParsedMintData {
  readonly parsed: {
    readonly info: {
      readonly decimals: number;
      readonly freezeAuthority: string | null;
      readonly isInitialized: boolean;
      readonly mintAuthority: string | null;
      readonly supply: string;
      readonly extensions?: readonly { readonly extension?: string }[];
    };
    readonly type: string;
  };
  readonly program: string;
  readonly space: number;
}

export interface SolanaMintObservation {
  readonly instrument: {
    readonly mint: string;
    readonly tokenProgram: string;
    readonly parsedProgram: string;
    readonly decimals: number;
    readonly supplyBaseUnits: string;
    readonly initialized: boolean;
    readonly mintAuthority: string | null;
    readonly freezeAuthority: string | null;
    readonly extensions: readonly string[];
    readonly accountSpace: number;
  };
  readonly provenance: {
    readonly source: "SOLANA_RPC";
    readonly cluster: SolanaCluster;
    readonly endpointHost: string;
    readonly commitment: "confirmed";
    readonly slot: number;
    readonly observedAt: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMintData(value: unknown): ParsedMintData {
  if (!isRecord(value) || !isRecord(value.parsed)) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "Solana RPC did not return parsed mint data.",
      { retryable: false, status: 502 },
    );
  }

  const parsed = value.parsed;
  const info = parsed.info;
  if (
    parsed.type !== "mint" ||
    !isRecord(info) ||
    typeof info.decimals !== "number" ||
    typeof info.isInitialized !== "boolean" ||
    typeof info.supply !== "string" ||
    typeof value.program !== "string" ||
    typeof value.space !== "number"
  ) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "The requested account is not a parsed token mint.",
      { retryable: false, status: 502 },
    );
  }

  const extensions = Array.isArray(info.extensions)
    ? info.extensions.filter(isRecord).map((extension) => ({
        extension:
          typeof extension.extension === "string"
            ? extension.extension
            : undefined,
      }))
    : undefined;

  return {
    parsed: {
      type: parsed.type,
      info: {
        decimals: info.decimals,
        freezeAuthority:
          typeof info.freezeAuthority === "string" ? info.freezeAuthority : null,
        isInitialized: info.isInitialized,
        mintAuthority:
          typeof info.mintAuthority === "string" ? info.mintAuthority : null,
        supply: info.supply,
        extensions,
      },
    },
    program: value.program,
    space: value.space,
  };
}

export class SolanaRpcAdapter {
  readonly #cluster: SolanaCluster;
  readonly #endpointHost: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;
  readonly #rpcUrl: string;
  readonly #timeoutMs: number;

  constructor(options: SolanaRpcAdapterOptions) {
    this.#cluster = options.cluster;
    this.#rpcUrl = options.rpcUrl;
    this.#endpointHost = new URL(options.rpcUrl).host;
    this.#timeoutMs = options.timeoutMs ?? 7_000;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#now = options.now ?? (() => new Date());
  }

  async getMint(mint: string): Promise<SolanaMintObservation> {
    try {
      address(mint);
    } catch {
      throw new IntegrationError(
        "INVALID_ADDRESS",
        "Mint must be a valid Solana address.",
        { retryable: false, status: 400 },
      );
    }

    const result = await this.#request<AccountInfoResult>("getAccountInfo", [
      mint,
      { commitment: "confirmed", encoding: "jsonParsed" },
    ]);

    if (result.value === null) {
      throw new IntegrationError(
        "ACCOUNT_NOT_FOUND",
        "No account exists for this mint on the configured cluster.",
        { retryable: false, status: 404 },
      );
    }

    const data = parseMintData(result.value.data);
    const extensions =
      data.parsed.info.extensions
        ?.map((extension) => extension.extension)
        .filter((extension): extension is string => extension !== undefined) ?? [];

    return Object.freeze({
      instrument: Object.freeze({
        mint,
        tokenProgram: result.value.owner,
        parsedProgram: data.program,
        decimals: data.parsed.info.decimals,
        supplyBaseUnits: data.parsed.info.supply,
        initialized: data.parsed.info.isInitialized,
        mintAuthority: data.parsed.info.mintAuthority,
        freezeAuthority: data.parsed.info.freezeAuthority,
        extensions: Object.freeze(extensions),
        accountSpace: data.space,
      }),
      provenance: Object.freeze({
        source: "SOLANA_RPC",
        cluster: this.#cluster,
        endpointHost: this.#endpointHost,
        commitment: "confirmed",
        slot: result.context.slot,
        observedAt: this.#now().toISOString(),
      }),
    });
  }

  async #request<T>(method: string, params: readonly unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(this.#rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new IntegrationError("RATE_LIMITED", "Solana RPC rate limit reached.", {
          retryable: true,
          status: 503,
        });
      }
      if (!response.ok) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          `Solana RPC returned HTTP ${response.status}.`,
          { retryable: true, status: 503 },
        );
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload)) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "Solana RPC returned an invalid JSON-RPC envelope.",
          { retryable: true, status: 502 },
        );
      }

      const envelope = payload as JsonRpcEnvelope<T>;
      if (envelope.error !== undefined) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          envelope.error.message ?? "Solana RPC returned an error.",
          { retryable: true, status: 503 },
        );
      }
      if (envelope.result === undefined) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "Solana RPC response did not contain a result.",
          { retryable: true, status: 502 },
        );
      }
      return envelope.result;
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "Solana RPC request failed or timed out.",
        { retryable: true, status: 503 },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
