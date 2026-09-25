import { integrationErrorResponse } from "@/integrations/integration-error";
import { auditQuoteAssetEligibility } from "@/services/quote-asset-eligibility";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mint: string }> },
) {
  try {
    const { mint } = await params;
    return Response.json(await auditQuoteAssetEligibility(mint), {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
