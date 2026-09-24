import { canonicalJson } from "@/domain/continuity/canonical-json";
import { buildQuoteRailReplayReceipt } from "@/domain/continuity/quote-rail-receipt";

export async function GET() {
  const receipt = await buildQuoteRailReplayReceipt();

  return new Response(canonicalJson(receipt.document), {
    headers: {
      "Cache-Control": "public, max-age=300, immutable",
      "Content-Disposition":
        'attachment; filename="continuity-quote-rail-receipt.json"',
      "Content-Type": "application/json; charset=utf-8",
      "X-Continuity-Receipt-Sha256": receipt.digest,
    },
  });
}
