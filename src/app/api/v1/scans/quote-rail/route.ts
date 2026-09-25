import { randomUUID } from "node:crypto";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { createLiveSentinelRunner } from "@/services/live-sentinel";

export const dynamic = "force-dynamic";

async function runScan(
  request: Request,
  access: "PUBLIC_SKILL_READ" | "CLAWPUMP_X402",
) {
  try {
    const url = new URL(request.url);
    const result = await createLiveSentinelRunner().run({
      idempotencyKey:
        request.headers.get("Idempotency-Key")?.trim() ||
        url.searchParams.get("idempotencyKey")?.trim() ||
        randomUUID(),
      trigger: access === "CLAWPUMP_X402" ? "CLAWPUMP_X402" : "ON_DEMAND",
    });
    return Response.json(
      {
        ...result,
        service: {
          access,
          execution: "READ_ONLY",
          paymentEnforcement:
            access === "CLAWPUMP_X402" ? "CLAWPUMP_X402_CLOUD" : "NONE",
          paymentProofVisibleHere: false,
          transactionAuthority: "NONE",
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
        status: result.reused ? 200 : 201,
      },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

/**
 * ClawPump Chat's public-fetch tool performs GET requests. This entry point
 * runs the same read-only policy without payment or transaction authority.
 */
export async function GET(request: Request) {
  return runScan(request, "PUBLIC_SKILL_READ");
}

/**
 * POST remains the service route used behind ClawPump's paid x402 gateway.
 */
export async function POST(request: Request) {
  return runScan(request, "CLAWPUMP_X402");
}
