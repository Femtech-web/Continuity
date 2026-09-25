import { assertSameOrigin, verifyOperatorChallenge } from "@/auth/operator-session";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload: unknown = await request.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("challengeId" in payload) ||
      typeof payload.challengeId !== "string" ||
      !("signature" in payload) ||
      typeof payload.signature !== "string" ||
      !("walletAddress" in payload) ||
      typeof payload.walletAddress !== "string"
    ) {
      throw new IntegrationError("AUTH_REQUIRED", "The wallet proof is incomplete.", {
        retryable: false,
        status: 400,
      });
    }
    return Response.json(
      await verifyOperatorChallenge({
        challengeId: payload.challengeId,
        signature: payload.signature,
        walletAddress: payload.walletAddress,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
