import { integrationErrorResponse } from "@/integrations/integration-error";
import { listProtectedMarketSummaries } from "@/persistence/market-monitoring-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { markets: await listProtectedMarketSummaries() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
