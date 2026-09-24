import { readServerEnvironment } from "@/config/server-environment";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { PreStocksAdapter } from "@/integrations/prestocks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const environment = readServerEnvironment();
    const adapter = new PreStocksAdapter({
      catalogUrl: environment.prestocks.catalogUrl,
      pageUrl: environment.prestocks.pageUrl,
      timeoutMs: environment.prestocks.timeoutMs,
    });
    const evidence = await adapter.captureSpaceXEvidence();

    return Response.json(evidence, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
