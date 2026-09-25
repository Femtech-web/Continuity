export type CatalogReadMode = "DETERMINISTIC_REPLAY" | "LIVE_PRESTOCKS_API";

export type MarketLifecycleState =
  | "ACTION_REQUIRED"
  | "CURRENT"
  | "EXPIRED"
  | "SOURCE_REMOVED";

export type MarketProtectionState =
  | "CATALOG_MONITORING"
  | "HISTORICAL_EVIDENCE"
  | "MANUAL_REVIEW"
  | "ROLLOVER_REQUIRED";

export interface MarketRegistryAsset {
  readonly description: string;
  readonly externalUrl: string;
  readonly imageUrl: string | null;
  readonly lifecycle: {
    readonly detail: string;
    readonly state: MarketLifecycleState;
    readonly title: string;
  };
  readonly markPriceUsd: number | null;
  readonly markValuationUsd: number | null;
  readonly mint: string;
  readonly name: string;
  readonly protection: {
    readonly detail: string;
    readonly state: MarketProtectionState;
    readonly title: string;
  };
  readonly slug: string;
  readonly supply: number | null;
  readonly symbol: string;
  readonly tokenPriceUsd: number | null;
}

export interface ArchivedLifecycleAsset {
  readonly actionType: "FIXED_RATIO_CONVERSION" | "UNRESOLVED_REMOVAL";
  readonly deadlineAt: string | null;
  readonly detail: string;
  readonly fixedRatio: string | null;
  readonly lifecycle: {
    readonly detail: string;
    readonly state: "EXPIRED" | "SOURCE_REMOVED";
    readonly title: string;
  };
  readonly name: string;
  readonly protection: {
    readonly detail: string;
    readonly state: "HISTORICAL_EVIDENCE" | "MANUAL_REVIEW";
    readonly title: string;
  };
  readonly slug: string;
  readonly sourceUrl: string;
  readonly successorSymbol: string | null;
  readonly symbol: string;
}

export interface PublicMarketRegistry {
  readonly archive: readonly ArchivedLifecycleAsset[];
  readonly assets: readonly MarketRegistryAsset[];
  readonly catalogSha256: string;
  readonly mode: CatalogReadMode;
  readonly observedAt: string;
  readonly sourceUrl: string;
  readonly summary: {
    readonly actionRequired: number;
    readonly current: number;
    readonly expiredArchive: number;
    readonly historicalWatchlist: number;
    readonly monitored: number;
    readonly universe: number;
  };
}

export interface CatalogAssetInput {
  readonly contractAddress: string;
  readonly description: string;
  readonly externalUrl: string;
  readonly imageUrl: string | null;
  readonly markPrice: number | null;
  readonly markValuation: number | null;
  readonly name: string;
  readonly supply: number | null;
  readonly symbol: string;
  readonly tokenPrice: number | null;
}

const spacexSymbol = "SPACEX";

function displayName(name: string) {
  return name.replace(/\s+PreStocks$/i, "");
}

function slugFor(asset: CatalogAssetInput) {
  try {
    const pathname = new URL(asset.externalUrl).pathname;
    const segment = pathname.split("/").filter(Boolean).at(-1);
    if (segment) return segment.toLowerCase();
  } catch {
    // A deterministic symbol slug is still safe when an upstream display URL
    // is malformed; the original URL remains visible in technical evidence.
  }
  return asset.symbol.toLowerCase();
}

export function buildPublicMarketRegistry(input: {
  readonly assets: readonly CatalogAssetInput[];
  readonly catalogSha256: string;
  readonly mode: CatalogReadMode;
  readonly observedAt: string;
  readonly sourceUrl: string;
}): PublicMarketRegistry {
  const assets = input.assets.map((asset): MarketRegistryAsset => {
    const actionRequired = asset.symbol.toUpperCase() === spacexSymbol;
    return Object.freeze({
      description: asset.description,
      externalUrl: asset.externalUrl,
      imageUrl: asset.imageUrl,
      lifecycle: Object.freeze(
        actionRequired
          ? {
              detail: "Swap before 12 Mar 2027",
              state: "ACTION_REQUIRED" as const,
              title: "Retiring",
            }
          : {
              detail: "No published lifecycle event",
              state: "CURRENT" as const,
              title: "Current",
            },
      ),
      markPriceUsd: asset.markPrice,
      markValuationUsd: asset.markValuation,
      mint: asset.contractAddress,
      name: displayName(asset.name),
      protection: Object.freeze(
        actionRequired
          ? {
              detail: "Successor market held for review",
              state: "ROLLOVER_REQUIRED" as const,
              title: "Protected case",
            }
          : {
              detail: "Public source watched for change",
              state: "CATALOG_MONITORING" as const,
              title: "Monitoring",
            },
      ),
      slug: slugFor(asset),
      supply: asset.supply,
      symbol: asset.symbol,
      tokenPriceUsd: asset.tokenPrice,
    });
  });

  const archive: readonly ArchivedLifecycleAsset[] = Object.freeze([
    Object.freeze({
      actionType: "FIXED_RATIO_CONVERSION" as const,
      deadlineAt: "2026-09-12T23:59:00Z",
      detail:
        "PreStocks required each XAI token to convert into 0.7165 SPACEX after xAI was acquired by SpaceX.",
      fixedRatio: "0.7165",
      lifecycle: Object.freeze({
        detail: "Deadline passed 12 Sep 2026",
        state: "EXPIRED" as const,
        title: "Expired transition",
      }),
      name: "xAI",
      protection: Object.freeze({
        detail: "Retained to test expired-event handling",
        state: "HISTORICAL_EVIDENCE" as const,
        title: "Lifecycle archive",
      }),
      slug: "xai" as const,
      sourceUrl: "https://prestocks.com/xai",
      successorSymbol: "SPACEX" as const,
      symbol: "XAI" as const,
    }),
    ...[
      ["Kraken", "KRAKEN", "kraken"],
      ["Discord", "DISCORD", "discord"],
      ["Epic Games", "EPICGAMES", "epic-games"],
      ["Databricks", "DATABRICKS", "databricks"],
      ["Perplexity", "PERPLEXITY", "perplexity"],
    ].map(([name, symbol, slug]) =>
      Object.freeze({
        actionType: "UNRESOLVED_REMOVAL" as const,
        deadlineAt: null,
        detail:
          "Listed by PreStocks at launch in 2025 but absent from the current public catalog. No official successor terms were found.",
        fixedRatio: null,
        lifecycle: Object.freeze({
          detail: "Absent from the current catalog",
          state: "SOURCE_REMOVED" as const,
          title: "Source removed",
        }),
        name,
        protection: Object.freeze({
          detail: "Continuity refuses to infer missing terms",
          state: "MANUAL_REVIEW" as const,
          title: "Manual review",
        }),
        slug,
        sourceUrl:
          "https://newsletter.prestocks.com/p/prestocks-are-live-trade-spacex-openai",
        successorSymbol: null,
        symbol,
      }),
    ),
  ]);

  const actionRequired = assets.filter(
    (asset) => asset.lifecycle.state === "ACTION_REQUIRED",
  ).length;

  return Object.freeze({
    archive,
    assets: Object.freeze(assets),
    catalogSha256: input.catalogSha256,
    mode: input.mode,
    observedAt: input.observedAt,
    sourceUrl: input.sourceUrl,
    summary: Object.freeze({
      actionRequired,
      current: assets.length - actionRequired,
      expiredArchive: archive.filter((asset) => asset.lifecycle.state === "EXPIRED")
        .length,
      historicalWatchlist: archive.filter(
        (asset) => asset.lifecycle.state === "SOURCE_REMOVED",
      ).length,
      monitored: assets.length,
      universe: assets.length + archive.length,
    }),
  });
}
