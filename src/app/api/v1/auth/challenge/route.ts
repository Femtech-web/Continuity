import { assertSameOrigin, createOperatorChallenge } from "@/auth/operator-session";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload: unknown = await request.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("walletAddress" in payload) ||
      typeof payload.walletAddress !== "string"
    ) {
      throw new IntegrationError("INVALID_ADDRESS", "A Solana wallet is required.", {
        retryable: false,
        status: 400,
      });
    }
    return Response.json(await createOperatorChallenge(payload.walletAddress), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
