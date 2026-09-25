import { requireOperatorSession } from "@/auth/operator-session";
import { readServerEnvironment } from "@/config/server-environment";
import { ClawPumpAdapter } from "@/integrations/clawpump";
import { integrationErrorResponse } from "@/integrations/integration-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOperatorSession();
    const environment = readServerEnvironment();
    const adapter = new ClawPumpAdapter({
      agentId: environment.clawpump.agentId,
      apiKey: environment.clawpump.apiKey,
      baseUrl: environment.clawpump.baseUrl,
      timeoutMs: environment.clawpump.timeoutMs,
    });
    return Response.json({ skills: await adapter.listSkills() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
