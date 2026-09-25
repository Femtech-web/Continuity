import { integrationErrorResponse } from "@/integrations/integration-error";
import { listAgentTreasuries } from "@/services/agent-treasury";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { treasuries: await listAgentTreasuries() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
