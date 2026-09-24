import { buildContTokenMetadata } from "@/domain/continuity/token-metadata";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return Response.json(buildContTokenMetadata(request.url), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
