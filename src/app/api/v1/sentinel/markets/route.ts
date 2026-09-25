import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { requireCronAuthorization } from "@/auth/cron-authorization";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { monitorRegisteredMarkets } from "@/services/registered-market-monitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireCronAuthorization(request);
    return Response.json(await monitorRegisteredMarkets(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    return Response.json(await monitorRegisteredMarkets(session.operatorId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
