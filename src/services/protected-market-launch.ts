import { readServerEnvironment } from "@/config/server-environment";
import type { ProtectedMarketDraft } from "@/domain/continuity/protected-market-draft";
import { ClawPumpAdapter } from "@/integrations/clawpump";
import { CompositeMarketReferenceAdapter } from "@/integrations/composite-market-reference";
import { JupiterQuoteAdapter } from "@/integrations/jupiter-quote";
import { buildStockQuotedLaunchReview } from "@/integrations/meteora-launch-config";
import { PythProAdapter } from "@/integrations/pyth-pro";
import type { OperatorAgentMapping } from "@/persistence/protected-market-store";
import { buildMeteoraLaunchPlan } from "@/transactions/meteora-launch-plan";

export async function buildProtectedMarketLaunchPlan(input: {
  readonly agent: OperatorAgentMapping;
  readonly authority: string;
  readonly draft: ProtectedMarketDraft;
  readonly metadataUri: string;
}) {
  const environment = readServerEnvironment();
  const clawpump = new ClawPumpAdapter({
    agentId: input.agent.clawPumpAgentId,
    apiKey: environment.clawpump.apiKey,
    baseUrl: environment.clawpump.baseUrl,
    timeoutMs: environment.clawpump.timeoutMs,
  });
  const marketReference = new CompositeMarketReferenceAdapter({
    jupiter: new JupiterQuoteAdapter(environment.jupiter),
    pyth: new PythProAdapter({
      apiKey: environment.pyth.apiKey,
      baseUrl: environment.pyth.baseUrl,
      channel: environment.pyth.channel,
      feedId: environment.pyth.feedId,
      timeoutMs: environment.pyth.timeoutMs,
    }),
  });
  const [clawPumpAuthority, observation] = await Promise.all([
    clawpump.resolveLaunchAuthority(),
    marketReference.getSpcxxUsdReference(),
  ]);
  const review = await buildStockQuotedLaunchReview({
    baseSymbol: input.draft.tokenSymbol,
    mode: "LIVE_COMPOSITE",
    observation,
    targetSupply: 1_000_000_000,
  });
  return buildMeteoraLaunchPlan({
    authority: input.authority,
    clawpump: clawPumpAuthority,
    metadataUri: input.metadataUri,
    review,
    rpcUrl: environment.solana.rpcUrl,
    timeoutMs: environment.solana.timeoutMs,
    token: { name: input.draft.tokenName, symbol: input.draft.tokenSymbol },
  });
}
