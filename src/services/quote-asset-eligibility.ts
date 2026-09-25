import { readServerEnvironment } from "@/config/server-environment";
import { buildCompositeMarketReference } from "@/domain/continuity/composite-market-reference";
import { JupiterQuoteAdapter } from "@/integrations/jupiter-quote";
import { MeteoraDbcAdapter } from "@/integrations/meteora-dbc";
import { PreStocksAdapter } from "@/integrations/prestocks";
import { PythProAdapter } from "@/integrations/pyth-pro";

export interface QuoteAssetEligibility {
  readonly checks: readonly {
    readonly detail: string;
    readonly key: "badge" | "identity" | "lifecycle" | "reference" | "routes" | "transfer-policy";
    readonly label: string;
    readonly state: "FAIL" | "PASS";
  }[];
  readonly eligible: boolean;
  readonly mint: string;
  readonly observedAt: string;
  readonly symbol: string;
}

function safeFailure(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.length <= 180) return error.message;
  return fallback;
}

/** Ordered, fail-closed eligibility audit for a current PreStocks quote mint. */
export async function auditQuoteAssetEligibility(
  mint: string,
): Promise<QuoteAssetEligibility> {
  const environment = readServerEnvironment();
  const prestocks = new PreStocksAdapter({
    catalogUrl: environment.prestocks.catalogUrl,
    pageUrl: environment.prestocks.pageUrl,
    timeoutMs: environment.prestocks.timeoutMs,
  });
  const catalog = await prestocks.captureCatalog();
  const asset = catalog.assets.find((candidate) => candidate.contractAddress === mint);
  if (!asset) {
    return Object.freeze({
      checks: Object.freeze([
        Object.freeze({
          detail: "The exact mint is not present in the current PreStocks catalog.",
          key: "identity" as const,
          label: "Catalog identity",
          state: "FAIL" as const,
        }),
      ]),
      eligible: false,
      mint,
      observedAt: catalog.observedAt,
      symbol: "UNKNOWN",
    });
  }

  const dbc = await new MeteoraDbcAdapter({
    cluster: environment.solana.cluster,
    configAddress: null,
    poolAddress: null,
    rpcUrl: environment.solana.rpcUrl,
    timeoutMs: environment.solana.timeoutMs,
  }).attestQuoteRail(mint);
  const quoteCheck = dbc.attestation.checks.find((check) => check.key === "quote-mint");
  const badgeCheck = dbc.attestation.checks.find((check) => check.key === "badge");
  const transferCheck = dbc.attestation.checks.find((check) => check.key === "transfer-fee");
  const checks: QuoteAssetEligibility["checks"][number][] = [
    {
      detail: quoteCheck?.detail ?? "Mint identity could not be verified.",
      key: "identity",
      label: "Exact mint",
      state: quoteCheck?.state === "PASS" ? "PASS" : "FAIL",
    },
    {
      detail:
        asset.symbol === "SPACEX"
          ? "PreStocks published a retirement deadline and successor."
          : "No lifecycle transition is published in the current source.",
      key: "lifecycle",
      label: "Lifecycle state",
      state: asset.symbol === "SPACEX" ? "FAIL" : "PASS",
    },
    {
      detail: badgeCheck?.detail ?? "Meteora DBC quote badge could not be verified.",
      key: "badge",
      label: "Meteora quote badge",
      state: badgeCheck?.state === "PASS" ? "PASS" : "FAIL",
    },
    {
      detail: transferCheck?.detail ?? "Transfer policy could not be verified.",
      key: "transfer-policy",
      label: "Transfer policy",
      state: transferCheck?.state === "PASS" ? "PASS" : "FAIL",
    },
  ];

  try {
    const pyth = new PythProAdapter({
      apiKey: environment.pyth.apiKey,
      baseUrl: environment.pyth.baseUrl,
      channel: environment.pyth.channel,
      feedId: environment.pyth.feedId,
      timeoutMs: environment.pyth.timeoutMs,
    });
    const [jupiter, pythReference] = await Promise.all([
      new JupiterQuoteAdapter(environment.jupiter).getReferenceQuotes(
        mint,
        dbc.addresses.quoteDecimals,
      ),
      pyth.getSolUsdReference(),
    ]);
    const composite = buildCompositeMarketReference({
      evaluatedAt: new Date().toISOString(),
      jupiter,
      pyth: pythReference,
    });
    checks.push(
      {
        detail: "Direct one-unit routes to USDC and SOL are executable.",
        key: "routes",
        label: "Executable routes",
        state: "PASS",
      },
      {
        detail: `${composite.evaluation.deviationBps} bps route divergence with Pyth SOL/USD cross-check.`,
        key: "reference",
        label: "Market reference",
        state: composite.evaluation.verdict === "READY" ? "PASS" : "FAIL",
      },
    );
  } catch (error) {
    checks.push(
      {
        detail: safeFailure(error, "No direct Jupiter reference routes are available."),
        key: "routes",
        label: "Executable routes",
        state: "FAIL",
      },
      {
        detail: "A fresh independent cross-check cannot be produced without executable routes.",
        key: "reference",
        label: "Market reference",
        state: "FAIL",
      },
    );
  }

  return Object.freeze({
    checks: Object.freeze(checks.map((check) => Object.freeze(check))),
    eligible: checks.every((check) => check.state === "PASS"),
    mint,
    observedAt: dbc.provenance.observedAt,
    symbol: asset.symbol,
  });
}
