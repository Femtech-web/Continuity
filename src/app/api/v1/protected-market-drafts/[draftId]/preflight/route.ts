import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import {
  findOperatorAgent,
  getProtectedMarketDraft,
  recordLaunchPreflight,
} from "@/persistence/protected-market-store";
import { buildProtectedMarketLaunchPlan } from "@/services/protected-market-launch";

export const dynamic = "force-dynamic";

function parseAuthority(payload: unknown): string {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("authority" in payload) ||
    typeof payload.authority !== "string"
  ) {
    throw new IntegrationError("INVALID_ADDRESS", "A connected operator wallet is required.", {
      retryable: false,
      status: 400,
    });
  }
  return payload.authority;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    const authority = parseAuthority(await request.json());
    if (authority !== session.walletAddress) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "The connected wallet does not own this operator session.",
        { retryable: false, status: 403 },
      );
    }
    const { draftId } = await context.params;
    const draft = await getProtectedMarketDraft(draftId, session.operatorId);
    if (!draft) {
      throw new IntegrationError("INVALID_RESPONSE", "Protected-market draft not found.", {
        retryable: false,
        status: 404,
      });
    }
    const agent = await findOperatorAgent(session.operatorId, draft.operatorAgentId);
    if (!agent) {
      throw new IntegrationError("AUTH_REQUIRED", "The selected agent is no longer owned by this operator.", {
        retryable: false,
        status: 403,
      });
    }

    const metadataUri = new URL(
      `/api/v1/protected-market-drafts/${draft.id}/metadata`,
      request.url,
    ).toString();
    const plan = await buildProtectedMarketLaunchPlan({
      agent,
      authority,
      draft,
      metadataUri,
    });
    await recordLaunchPreflight({
      configurationHash: plan.configurationHash,
      draftId: draft.id,
      operatorId: session.operatorId,
      planHash: plan.planHash,
      result: plan,
      state: plan.simulation.state === "PASSED" ? "PASSED" : "FAILED",
    });
    return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
