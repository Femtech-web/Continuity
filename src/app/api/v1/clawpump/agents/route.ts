import { z, ZodError } from "zod";
import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { readServerEnvironment } from "@/config/server-environment";
import { ClawPumpAdapter } from "@/integrations/clawpump";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import { getSupabaseRestClient, postgrestEquals } from "@/persistence/supabase-rest";

export const dynamic = "force-dynamic";

const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(48),
  persona: z.string().trim().min(10).max(500),
  skills: z.array(z.string().trim().min(1)).max(12),
});

interface AgentMappingRow {
  readonly agent_name: string;
  readonly clawpump_agent_id: string;
  readonly clawpump_wallet_address: string;
  readonly id: number;
}

function adapter() {
  const environment = readServerEnvironment();
  return new ClawPumpAdapter({
    agentId: environment.clawpump.agentId,
    apiKey: environment.clawpump.apiKey,
    baseUrl: environment.clawpump.baseUrl,
    timeoutMs: environment.clawpump.timeoutMs,
  });
}

export async function GET() {
  try {
    const session = await requireOperatorSession();
    const database = getSupabaseRestClient();
    const mappings = await database.request<readonly AgentMappingRow[]>("operator_agents", {
      query: `operator_id=${postgrestEquals(String(session.operatorId))}&select=id,clawpump_agent_id,clawpump_wallet_address,agent_name&order=created_at.desc`,
    });
    const liveAgents = await adapter().listAgents();
    const liveById = new Map(liveAgents.map((agent) => [agent.id, agent]));
    return Response.json({
      agents: mappings.map((mapping) => ({
        id: mapping.clawpump_agent_id,
        mappingId: mapping.id,
        name: mapping.agent_name,
        skills: liveById.get(mapping.clawpump_agent_id)?.skills ?? [],
        status: liveById.get(mapping.clawpump_agent_id)?.status ?? "unknown",
        walletAddress: mapping.clawpump_wallet_address,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    const input = createAgentSchema.parse(await request.json());
    const created = await adapter().createAgent(input);
    const database = getSupabaseRestClient();
    const rows = await database.request<readonly AgentMappingRow[]>("operator_agents", {
      body: {
        agent_name: created.name,
        clawpump_agent_id: created.id,
        clawpump_wallet_address: created.walletAddress,
        operator_id: session.operatorId,
      },
      method: "POST",
      prefer: "return=representation",
    });
    const mapping = rows[0];
    if (!mapping) {
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "The agent was created, but its Continuity ownership record could not be saved.",
        { retryable: false, status: 503 },
      );
    }
    return Response.json({
      agent: {
        ...created,
        mappingId: mapping.id,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return integrationErrorResponse(
        new IntegrationError("INVALID_RESPONSE", "The agent definition is incomplete.", {
          retryable: false,
          status: 400,
        }),
      );
    }
    return integrationErrorResponse(error);
  }
}
