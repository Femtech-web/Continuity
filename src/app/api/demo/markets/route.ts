import { buildMarketRegistryFixture } from "@/domain/continuity/market-registry-fixture";

export async function GET() {
  return Response.json(await buildMarketRegistryFixture(), {
    headers: { "Cache-Control": "public, max-age=300, immutable" },
  });
}
