import { buildPublicMarketRegistry } from "../domain/continuity/market-registry.ts";
import type { PreStocksAdapter } from "../integrations/prestocks.ts";

/**
 * Converts the complete live PreStocks catalog into Continuity's public
 * lifecycle registry. This scan is read-only and never creates a manifest or
 * transaction for instruments without reviewed lifecycle terms.
 */
export async function scanPublicMarketRegistry(
  adapter: Pick<PreStocksAdapter, "captureCatalog">,
) {
  const snapshot = await adapter.captureCatalog();
  return buildPublicMarketRegistry({
    assets: snapshot.assets,
    catalogSha256: snapshot.snapshotSha256,
    mode: "LIVE_PRESTOCKS_API",
    observedAt: snapshot.observedAt,
    sourceUrl: snapshot.sourceUrl,
  });
}

