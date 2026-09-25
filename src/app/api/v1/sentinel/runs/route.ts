import { randomUUID } from "node:crypto";
import { integrationErrorResponse } from "@/integrations/integration-error";
import {
  createLiveSentinelRunner,
  getLiveAgentRunStore,
} from "@/services/live-sentinel";

export const dynamic = "force-dynamic";

function idempotencyKey(request: Request): string {
  return request.headers.get("Idempotency-Key")?.trim() || randomUUID();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
    const records = await getLiveAgentRunStore().list(requestedLimit);
    return Response.json(
      {
        records,
        storage: {
          integrity: "SHA256_HASH_CHAIN",
          scope:
            process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
              ? "SUPABASE_DURABLE"
              : process.env.VERCEL
                ? "RUNTIME_EPHEMERAL"
                : "LOCAL_APPEND_ONLY",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await createLiveSentinelRunner().run({
      idempotencyKey: idempotencyKey(request),
      trigger: "ON_DEMAND",
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
      status: result.reused ? 200 : 201,
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
