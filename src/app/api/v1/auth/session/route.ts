import {
  assertSameOrigin,
  clearOperatorSession,
  getOperatorSession,
} from "@/auth/operator-session";
import { integrationErrorResponse } from "@/integrations/integration-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getOperatorSession();
    return Response.json(
      session ? { authenticated: true, ...session } : { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await clearOperatorSession();
    return new Response(null, { status: 204 });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
