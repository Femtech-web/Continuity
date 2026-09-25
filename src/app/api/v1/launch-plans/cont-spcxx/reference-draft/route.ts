import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { readServerEnvironment } from "@/config/server-environment";
import { ClawPumpAdapter } from "@/integrations/clawpump";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import { SPCXX_MINT } from "@/integrations/meteora-dbc";
import {
  ensureOperatorAgentMapping,
  getOrCreateReferenceDraft,
} from "@/persistence/protected-market-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    const environment = readServerEnvironment();
    if (!environment.cont.operatorWallet) {
      throw new IntegrationError(
        "CONFIG_REQUIRED",
        "Set CONT_OPERATOR_WALLET to the human wallet authorized to launch the locked CONT reference market.",
        { retryable: false, status: 503 },
      );
    }
    if (session.walletAddress !== environment.cont.operatorWallet) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "This wallet may create custom protected markets but is not the configured CONT reference operator.",
        { retryable: false, status: 403 },
      );
    }
    const clawpump = new ClawPumpAdapter({
      agentId: environment.clawpump.agentId,
      apiKey: environment.clawpump.apiKey,
      baseUrl: environment.clawpump.baseUrl,
      timeoutMs: environment.clawpump.timeoutMs,
    });
    const authority = await clawpump.resolveLaunchAuthority();
    const mapping = await ensureOperatorAgentMapping({
      agentName: authority.agent.name,
      clawPumpAgentId: authority.agent.id,
      clawPumpWalletAddress: authority.agent.walletAddress,
      operatorId: session.operatorId,
    });
    const draft = await getOrCreateReferenceDraft({
      operatorAgentId: mapping.id,
      operatorId: session.operatorId,
      quoteMint: SPCXX_MINT,
    });
    return Response.json({ draft }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
