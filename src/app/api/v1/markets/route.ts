import { readServerEnvironment } from "@/config/server-environment";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { PreStocksAdapter } from "@/integrations/prestocks";
import { scanPublicMarketRegistry } from "@/services/market-registry-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const environment = readServerEnvironment();
    const registry = await scanPublicMarketRegistry(
      new PreStocksAdapter({
        catalogUrl: environment.prestocks.catalogUrl,
        pageUrl: environment.prestocks.pageUrl,
        timeoutMs: environment.prestocks.timeoutMs,
      }),
    );

    return Response.json(registry, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

