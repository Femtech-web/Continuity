import { getProtectedMarketDraft } from "@/persistence/protected-market-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await context.params;
  const draft = await getProtectedMarketDraft(draftId);
  if (!draft) return Response.json({ error: "Draft not found" }, { status: 404 });
  const origin = new URL(request.url).origin;
  const image = draft.tokenImageUrl ?? new URL("/token/cont.png", origin).toString();
  return Response.json({
    attributes: [
      { trait_type: "Product", value: "Continuity protected market" },
      { trait_type: "Quote asset", value: draft.quoteSymbol },
      { trait_type: "Policy", value: "Equity Continuity v1" },
    ],
    description: draft.tokenDescription,
    external_url: origin,
    image,
    name: draft.tokenName,
    properties: {
      category: "image",
      files: [{ type: "image/png", uri: image }],
    },
    symbol: draft.tokenSymbol,
  }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
