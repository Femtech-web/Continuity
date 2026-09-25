import { requireCronAuthorization } from "@/auth/cron-authorization";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { createLiveSentinelRunner } from "@/services/live-sentinel";
import { monitorRegisteredMarkets } from "@/services/registered-market-monitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireCronAuthorization(request);
    const bucket = Math.floor(Date.now() / 600_000);
    const lifecycle = await createLiveSentinelRunner().run({
      idempotencyKey: `scheduled:CONT-SPCXx:${bucket}`,
      trigger: "SCHEDULED",
    });
    const markets = await monitorRegisteredMarkets();
    return Response.json(
      {
        lifecycle: {
          action: lifecycle.record.document.decision.action,
          nextRunAt: lifecycle.record.document.nextRunAt,
          recordHash: lifecycle.record.integrity.recordHash,
          reused: lifecycle.reused,
          runId: lifecycle.record.document.runId,
          verdict: lifecycle.record.document.decision.verdict,
        },
        markets,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
