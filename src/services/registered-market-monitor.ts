import { readServerEnvironment } from "@/config/server-environment";
import { canonicalSha256 } from "@/domain/continuity/canonical-json";
import { MeteoraDbcAdapter, SPCXX_MINT } from "@/integrations/meteora-dbc";
import { PreStocksAdapter } from "@/integrations/prestocks";
import {
  createMarketAlert,
  latestMonitoringHash,
  listProtectedMarketsForMonitoring,
  persistLifecycleManifest,
  recordMarketObservation,
  type ProtectedMarketRecord,
} from "@/persistence/market-monitoring-store";

export interface MarketMonitoringResult {
  readonly alertsCreated: number;
  readonly checked: number;
  readonly results: readonly {
    readonly marketId: string;
    readonly receiptHash: string;
    readonly status: ProtectedMarketRecord["status"];
  }[];
}

export async function monitorRegisteredMarkets(
  operatorId?: number,
  marketId?: string,
): Promise<MarketMonitoringResult> {
  const environment = readServerEnvironment();
  const markets = await listProtectedMarketsForMonitoring(operatorId, marketId);
  if (markets.length === 0) {
    return Object.freeze({ alertsCreated: 0, checked: 0, results: Object.freeze([]) });
  }

  const evidence = await new PreStocksAdapter({
    catalogUrl: environment.prestocks.catalogUrl,
    pageUrl: environment.prestocks.pageUrl,
    timeoutMs: environment.prestocks.timeoutMs,
  }).captureSpaceXEvidence();
  await persistLifecycleManifest({
    contentHash: evidence.snapshot.sourceContentSha256,
    instrumentMint: evidence.snapshot.sourceInstrument.mint,
    manifest: evidence.manifest,
    manifestHash: evidence.manifestSha256,
    observedAt: evidence.snapshot.observedAt,
    sourceUrl: evidence.snapshot.sourceUrl,
  });

  let alertsCreated = 0;
  const results = [];
  for (const market of markets) {
    const observedAt = new Date().toISOString();
    const observation = market.quoteMint === SPCXX_MINT
      ? await new MeteoraDbcAdapter({
          cluster: environment.solana.cluster,
          configAddress: market.configAddress,
          poolAddress: market.virtualPoolAddress,
          rpcUrl: environment.solana.rpcUrl,
          timeoutMs: environment.solana.timeoutMs,
        }).attestSpcxxQuoteRail()
      : null;
    const quoteStillCurrent =
      market.quoteMint === SPCXX_MINT &&
      evidence.snapshot.lifecycleNotice.successorMint === market.quoteMint;
    const poolMatches =
      observation?.market?.baseMint === market.baseMint &&
      observation.market.configAddress === market.configAddress &&
      observation.market.quoteMint === market.quoteMint;
    const lifecycleState = quoteStillCurrent ? "CURRENT" : "REVIEW_REQUIRED";
    const status: ProtectedMarketRecord["status"] = !quoteStillCurrent || !poolMatches
      ? "ROLLOVER_REQUIRED"
      : observation?.market?.isMigrated
        ? "GRADUATED"
        : "ACTIVE";
    const previousHash = await latestMonitoringHash(market.id);
    const payload = {
      expected: {
        baseMint: market.baseMint,
        configAddress: market.configAddress,
        configurationHash: market.configurationHash,
        planHash: market.planHash,
        quoteMint: market.quoteMint,
        virtualPoolAddress: market.virtualPoolAddress,
      },
      lifecycle: {
        deadlineAt: evidence.manifest.deadlineAt,
        manifestHash: evidence.manifestSha256,
        sourceObservedAt: evidence.snapshot.observedAt,
        state: lifecycleState,
      },
      observed: observation,
      observedAt,
      status,
    };
    const receiptHash = await canonicalSha256({ payload, previousHash });
    await recordMarketObservation({
      baseReserve: observation?.market?.baseReserve ?? null,
      curveProgressBps:
        observation?.market === null || observation === null
          ? null
          : Math.round(observation.market.curveProgress * 10_000),
      dbcState: observation?.attestation.state ?? "UNSUPPORTED_QUOTE",
      feeBps: observation?.market?.openingFeeBps ?? null,
      lifecycleState,
      market,
      observedAt,
      previousHash,
      quoteReserve: observation?.market?.quoteReserve ?? null,
      rawPayload: payload,
      receiptHash,
      status,
    });
    if (status === "ROLLOVER_REQUIRED") {
      const created = await createMarketAlert({
        code: quoteStillCurrent ? "MARKET_STATE_MISMATCH" : "QUOTE_LIFECYCLE_CHANGED",
        detail: quoteStillCurrent
          ? "The decoded Meteora market no longer matches the registered base, quote, and configuration accounts."
          : "The registered stock quote is no longer the current issuer-backed successor instrument.",
        evidenceHash: receiptHash,
        market,
        severity: "CRITICAL",
        title: "Managed market requires operator review",
      });
      if (created) alertsCreated += 1;
    }
    results.push(Object.freeze({ marketId: market.id, receiptHash, status }));
  }

  return Object.freeze({
    alertsCreated,
    checked: markets.length,
    results: Object.freeze(results),
  });
}
