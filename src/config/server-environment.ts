export type SolanaCluster = "devnet" | "mainnet-beta";

export interface ServerEnvironment {
  readonly clawpump: {
    readonly agentId: string | null;
    readonly apiKey: string | null;
    readonly baseUrl: string;
    readonly timeoutMs: number;
  };
  readonly cont: {
    readonly metadataUri: string | null;
  };
  readonly meteora: {
    readonly configAddress: string | null;
    readonly poolAddress: string | null;
  };
  readonly prestocks: {
    readonly catalogUrl: string;
    readonly pageUrl: string;
    readonly timeoutMs: number;
  };
  readonly pyth: {
    readonly apiKey: string | null;
    readonly baseUrl: string;
    readonly channel: "fixed_rate@200ms";
    readonly feedId: number;
    readonly timeoutMs: number;
  };
  readonly solana: {
    readonly cluster: SolanaCluster;
    readonly rpcUrl: string;
    readonly timeoutMs: number;
  };
}

const defaultRpcUrls: Record<SolanaCluster, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

function parseCluster(value: string | undefined): SolanaCluster {
  if (value === undefined || value === "mainnet" || value === "mainnet-beta") {
    return "mainnet-beta";
  }
  if (value === "devnet") return "devnet";
  throw new TypeError("SOLANA_CLUSTER must be mainnet, mainnet-beta, or devnet");
}

function parseHttpUrl(value: string, field: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError(`${field} must use http or https`);
  }
  return url.toString();
}

function parseTimeout(value: string | undefined, field = "SOLANA_RPC_TIMEOUT_MS"): number {
  if (value === undefined) return 7_000;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 500 || timeout > 30_000) {
    throw new TypeError(`${field} must be an integer from 500 to 30000`);
  }
  return timeout;
}

function parseOptionalAddress(
  value: string | undefined,
  field: string,
): string | null {
  if (value === undefined || value.trim() === "") return null;

  const candidate = value.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)) {
    throw new TypeError(`${field} must be a Solana address`);
  }
  return candidate;
}

function parseFeedId(value: string | undefined): number {
  if (value === undefined) return 3329;
  const feedId = Number(value);
  if (!Number.isInteger(feedId) || feedId <= 0) {
    throw new TypeError("PYTH_SPCXX_USD_FEED_ID must be a positive integer");
  }
  return feedId;
}

function parseOptionalHttpUrl(
  value: string | undefined,
  field: string,
): string | null {
  if (value === undefined || value.trim() === "") return null;
  return parseHttpUrl(value.trim(), field);
}

/** Reads server-only integration settings without exposing credentials to the client. */
export function readServerEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ServerEnvironment {
  const cluster = parseCluster(
    environment.SOLANA_CLUSTER ?? environment.NEXT_PUBLIC_SOLANA_CLUSTER,
  );
  const configuredRpc =
    environment.SOLANA_RPC_URL ?? environment.NEXT_PUBLIC_SOLANA_RPC_URL;

  return Object.freeze({
    clawpump: Object.freeze({
      agentId: environment.CLAWPUMP_AGENT_ID?.trim() || null,
      apiKey: environment.CLAWPUMP_API_KEY?.trim() || null,
      baseUrl: parseHttpUrl(
        environment.CLAWPUMP_API_URL ?? "https://clawpump.tech/api/v1",
        "CLAWPUMP_API_URL",
      ),
      timeoutMs: parseTimeout(
        environment.CLAWPUMP_TIMEOUT_MS,
        "CLAWPUMP_TIMEOUT_MS",
      ),
    }),
    cont: Object.freeze({
      metadataUri: parseOptionalHttpUrl(
        environment.CONT_TOKEN_METADATA_URI,
        "CONT_TOKEN_METADATA_URI",
      ),
    }),
    meteora: Object.freeze({
      configAddress: parseOptionalAddress(
        environment.METEORA_DBC_CONFIG_ADDRESS,
        "METEORA_DBC_CONFIG_ADDRESS",
      ),
      poolAddress: parseOptionalAddress(
        environment.METEORA_DBC_POOL_ADDRESS,
        "METEORA_DBC_POOL_ADDRESS",
      ),
    }),
    prestocks: Object.freeze({
      catalogUrl: parseHttpUrl(
        environment.PRESTOCKS_CATALOG_URL ??
          environment.PRESTOCKS_API_URL ??
          "https://prestocks.com/api/prestocks",
        "PRESTOCKS_CATALOG_URL",
      ),
      pageUrl: parseHttpUrl(
        environment.PRESTOCKS_SPACEX_URL ?? "https://prestocks.com/spacex",
        "PRESTOCKS_SPACEX_URL",
      ),
      timeoutMs: parseTimeout(
        environment.PRESTOCKS_TIMEOUT_MS,
        "PRESTOCKS_TIMEOUT_MS",
      ),
    }),
    pyth: Object.freeze({
      apiKey:
        environment.PYTH_PRO_API_KEY?.trim() ||
        environment.PYTH_ACCESS_TOKEN?.trim() ||
        null,
      baseUrl: parseHttpUrl(
        environment.PYTH_PRO_BASE_URL ?? "https://pyth-lazer.dourolabs.app",
        "PYTH_PRO_BASE_URL",
      ),
      channel: "fixed_rate@200ms" as const,
      feedId: parseFeedId(environment.PYTH_SPCXX_USD_FEED_ID),
      timeoutMs: parseTimeout(environment.PYTH_PRO_TIMEOUT_MS, "PYTH_PRO_TIMEOUT_MS"),
    }),
    solana: Object.freeze({
      cluster,
      rpcUrl: parseHttpUrl(configuredRpc ?? defaultRpcUrls[cluster], "SOLANA_RPC_URL"),
      timeoutMs: parseTimeout(environment.SOLANA_RPC_TIMEOUT_MS),
    }),
  });
}
