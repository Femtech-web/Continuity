import { Connection, ParsedAccountData, PublicKey } from "@solana/web3.js";
import { readServerEnvironment } from "@/config/server-environment";
import { MeteoraDbcAdapter } from "@/integrations/meteora-dbc";
import {
  listProtectedMarketSummaries,
  type ProtectedMarketSummary,
} from "@/persistence/market-monitoring-store";

export interface AgentTreasuryAsset {
  readonly claimed: string;
  readonly decimals: number;
  readonly mint: string;
  readonly symbol: string;
  readonly total: string;
  readonly unclaimed: string;
  readonly walletBalance: string;
}

export interface AgentTreasurySummary {
  readonly agent: {
    readonly name: string;
    readonly walletAddress: string;
    readonly walletSolLamports: string | null;
  };
  readonly assets: null | {
    readonly base: AgentTreasuryAsset;
    readonly quote: AgentTreasuryAsset;
  };
  readonly market: {
    readonly baseSymbol: string;
    readonly id: string;
    readonly poolAddress: string;
    readonly quoteSymbol: string;
    readonly status: ProtectedMarketSummary["status"];
  };
  readonly observedAt: string;
  readonly policy: {
    readonly automation: "LOCKED";
    readonly custody: "AGENT_WALLET";
    readonly lendingDestination: "NOT_ACTIVATED";
    readonly mode: "READ_ONLY";
  };
  readonly state: "OBSERVING" | "PAUSED" | "UNAVAILABLE";
  readonly statusDetail: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Treasury read timed out.")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: string,
): Promise<string> {
  const response = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint: new PublicKey(mint) },
    "confirmed",
  );
  return response.value.reduce((total, item) => {
    const data = item.account.data as ParsedAccountData;
    const amount = data.parsed?.info?.tokenAmount?.amount;
    return total + BigInt(typeof amount === "string" ? amount : "0");
  }, 0n).toString();
}

async function readTreasury(
  market: ProtectedMarketSummary,
  connection: Connection,
): Promise<AgentTreasurySummary> {
  const environment = readServerEnvironment();
  const observedAt = new Date().toISOString();
  const common = {
    agent: {
      name: market.agentName,
      walletAddress: market.agentWalletAddress,
      walletSolLamports: null,
    },
    market: {
      baseSymbol: market.baseSymbol,
      id: market.id,
      poolAddress: market.virtualPoolAddress,
      quoteSymbol: market.quoteSymbol,
      status: market.status,
    },
    observedAt,
    policy: {
      automation: "LOCKED" as const,
      custody: "AGENT_WALLET" as const,
      lendingDestination: "NOT_ACTIVATED" as const,
      mode: "READ_ONLY" as const,
    },
  };

  if (!market.agentWalletAddress) {
    return Object.freeze({
      ...common,
      assets: null,
      state: "UNAVAILABLE",
      statusDetail: "The protected market is missing its bound agent wallet.",
    });
  }

  try {
    const owner = new PublicKey(market.agentWalletAddress);
    const treasury = await new MeteoraDbcAdapter({
      cluster: environment.solana.cluster,
      configAddress: market.configAddress,
      poolAddress: market.virtualPoolAddress,
      rpcUrl: environment.solana.rpcUrl,
      timeoutMs: environment.solana.timeoutMs,
    }).readPartnerTreasury();
    const [walletSolLamports, baseWalletBalance, quoteWalletBalance] =
      await withTimeout(
        Promise.all([
          connection.getBalance(owner, "confirmed").then(String),
          readTokenBalance(connection, owner, treasury.assets.base.mint),
          readTokenBalance(connection, owner, treasury.assets.quote.mint),
        ]),
        environment.solana.timeoutMs,
      );
    const authorityMatches =
      treasury.authority.feeClaimer === market.agentWalletAddress;
    const marketSafe = market.status === "ACTIVE" || market.status === "GRADUATED";

    return Object.freeze({
      ...common,
      agent: Object.freeze({ ...common.agent, walletSolLamports }),
      assets: Object.freeze({
        base: Object.freeze({
          ...treasury.assets.base,
          symbol: market.baseSymbol,
          walletBalance: baseWalletBalance,
        }),
        quote: Object.freeze({
          ...treasury.assets.quote,
          symbol: market.quoteSymbol,
          walletBalance: quoteWalletBalance,
        }),
      }),
      observedAt: treasury.observedAt,
      state: authorityMatches && marketSafe ? "OBSERVING" : "PAUSED",
      statusDetail: !authorityMatches
        ? "The market fee authority does not match its bound agent wallet."
        : !marketSafe
          ? "Treasury actions stay paused while Sentinel requires market review."
          : "Earned fees are visible. Claims and lending remain locked until agent signing is verified.",
    });
  } catch {
    return Object.freeze({
      ...common,
      assets: null,
      state: "UNAVAILABLE",
      statusDetail: "Live fee balances could not be read from Solana. No value was inferred.",
    });
  }
}

export async function listAgentTreasuries(): Promise<readonly AgentTreasurySummary[]> {
  const environment = readServerEnvironment();
  const markets = await listProtectedMarketSummaries();
  const connection = new Connection(environment.solana.rpcUrl, "confirmed");
  return Object.freeze(
    await Promise.all(markets.map((market) => readTreasury(market, connection))),
  );
}
