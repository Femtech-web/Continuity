import { join, resolve } from "node:path";
import { readServerEnvironment } from "../config/server-environment.ts";
import { CompositeMarketReferenceAdapter } from "../integrations/composite-market-reference.ts";
import { JupiterQuoteAdapter } from "../integrations/jupiter-quote.ts";
import { MeteoraDbcAdapter } from "../integrations/meteora-dbc.ts";
import { PreStocksAdapter } from "../integrations/prestocks.ts";
import { PythProAdapter } from "../integrations/pyth-pro.ts";
import {
  FileAgentRunStore,
  SupabaseAgentRunStore,
  type AgentRunStore,
} from "../persistence/agent-run-store.ts";
import { SentinelRunner } from "./sentinel-runner.ts";

let store: AgentRunStore | null = null;

function dataFilePath(): string {
  const defaultDirectory = process.env.VERCEL
    ? "/tmp/continuity"
    : join(process.cwd(), ".continuity-data");
  const directory = resolve(
    process.env.CONTINUITY_DATA_DIR?.trim() || defaultDirectory,
  );
  return join(directory, "sentinel-runs.jsonl");
}

export function getLiveAgentRunStore(): AgentRunStore {
  if (!store) {
    const environment = readServerEnvironment();
    store = environment.supabase.url && environment.supabase.secretKey
      ? new SupabaseAgentRunStore()
      : new FileAgentRunStore(dataFilePath());
  }
  return store;
}

export function createLiveSentinelRunner(): SentinelRunner {
  const environment = readServerEnvironment();
  const pyth = new PythProAdapter({
    apiKey: environment.pyth.apiKey,
    baseUrl: environment.pyth.baseUrl,
    channel: environment.pyth.channel,
    feedId: environment.pyth.feedId,
    timeoutMs: environment.pyth.timeoutMs,
  });

  return new SentinelRunner({
    dbc: new MeteoraDbcAdapter({
      cluster: environment.solana.cluster,
      configAddress: environment.meteora.configAddress,
      poolAddress: environment.meteora.poolAddress,
      rpcUrl: environment.solana.rpcUrl,
      timeoutMs: environment.solana.timeoutMs,
    }),
    evidence: new PreStocksAdapter({
      catalogUrl: environment.prestocks.catalogUrl,
      pageUrl: environment.prestocks.pageUrl,
      timeoutMs: environment.prestocks.timeoutMs,
    }),
    marketReference: new CompositeMarketReferenceAdapter({
      jupiter: new JupiterQuoteAdapter(environment.jupiter),
      pyth,
    }),
    store: getLiveAgentRunStore(),
  });
}
