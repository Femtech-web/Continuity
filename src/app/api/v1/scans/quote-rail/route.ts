import { randomUUID } from "node:crypto";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { createLiveSentinelRunner } from "@/services/live-sentinel";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await createLiveSentinelRunner().run({
      idempotencyKey:
        request.headers.get("Idempotency-Key")?.trim() || randomUUID(),
      trigger: "CLAWPUMP_X402",
    });
    return Response.json(
      {
        ...result,
        service: {
          execution: "READ_ONLY",
          paymentEnforcement: "CLAWPUMP_X402_CLOUD",
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
