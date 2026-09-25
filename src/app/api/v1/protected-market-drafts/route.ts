import { ZodError } from "zod";
import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { protectedMarketDraftSchema } from "@/domain/continuity/protected-market-draft";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import {
  createProtectedMarketDraft,
  listProtectedMarketDrafts,
} from "@/persistence/protected-market-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireOperatorSession();
    return Response.json({ drafts: await listProtectedMarketDrafts(session.operatorId) }, {
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
    const input = protectedMarketDraftSchema.parse(await request.json());
    return Response.json(
      { draft: await createProtectedMarketDraft(session.operatorId, input) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return integrationErrorResponse(
        new IntegrationError("INVALID_RESPONSE", "The protected-market draft is incomplete.", {
          retryable: false,
          status: 400,
        }),
      );
    }
    return integrationErrorResponse(error);
  }
}
