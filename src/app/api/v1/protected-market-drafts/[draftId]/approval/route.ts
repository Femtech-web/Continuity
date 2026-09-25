import { z, ZodError } from "zod";
import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import {
  createLaunchAttempt,
  expireStaleUnsignedLaunchAttempts,
  getLaunchAttemptByIdempotency,
  markLaunchAttemptFailed,
  markLaunchAttemptReady,
  type LaunchAttempt,
} from "@/persistence/launch-store";
import {
  findOperatorAgent,
  getProtectedMarketDraft,
  recordLaunchPreflight,
} from "@/persistence/protected-market-store";
import { buildProtectedMarketLaunchPlan } from "@/services/protected-market-launch";

export const dynamic = "force-dynamic";

const approvalSchema = z.object({
  authority: z.string().min(32).max(44),
  idempotencyKey: z.string().uuid(),
});

function approvalPayload(attempt: LaunchAttempt) {
  return Object.freeze({
    attemptId: attempt.id,
    expiresAtBlockHeight: attempt.expiresAtBlockHeight,
    market: Object.freeze({
      baseMint: attempt.baseMint,
      configAddress: attempt.configAddress,
      poolAddress: attempt.virtualPoolAddress,
      quoteMint: attempt.quoteMint,
    }),
    messageHash: attempt.messageHash,
    recentBlockhash: attempt.recentBlockhash,
    serializedTransaction: attempt.serializedTransaction,
    status: attempt.status,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  let attempt: LaunchAttempt | null = null;
  let operatorId: number | null = null;
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    operatorId = session.operatorId;
    const input = approvalSchema.parse(await request.json());
    if (input.authority !== session.walletAddress) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "The connected wallet does not own this launch draft.",
        { retryable: false, status: 403 },
      );
    }
    const { draftId } = await context.params;
    const staleBefore = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    await expireStaleUnsignedLaunchAttempts({
      draftId,
      operatorId: session.operatorId,
      staleBefore,
    });
    const existing = await getLaunchAttemptByIdempotency({
      idempotencyKey: input.idempotencyKey,
      operatorId: session.operatorId,
    });
    if (existing?.status === "READY") {
      return Response.json(approvalPayload(existing), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (existing) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        `This approval request is already ${existing.status.toLowerCase()}. Start a new approval only after reconciling it.`,
        { retryable: false, status: 409 },
      );
    }

    const draft = await getProtectedMarketDraft(draftId, session.operatorId);
    if (!draft) {
      throw new IntegrationError("INVALID_RESPONSE", "Protected-market draft not found.", {
        retryable: false,
        status: 404,
      });
    }
    if (draft.status !== "PREFLIGHT_READY") {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "Run a passing live preflight before requesting wallet approval.",
        { retryable: false, status: 409 },
      );
    }
    const agent = await findOperatorAgent(session.operatorId, draft.operatorAgentId);
    if (!agent) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "The selected ClawPump agent is no longer owned by this operator.",
        { retryable: false, status: 403 },
      );
    }

    attempt = await createLaunchAttempt({
      draftId,
      idempotencyKey: input.idempotencyKey,
      operatorId: session.operatorId,
    });
    const metadataUri = new URL(
      `/api/v1/protected-market-drafts/${draft.id}/metadata`,
      request.url,
    ).toString();
    const plan = await buildProtectedMarketLaunchPlan({
      agent,
      authority: input.authority,
      draft,
      metadataUri,
    });
    await recordLaunchPreflight({
      configurationHash: plan.configurationHash,
      draftId: draft.id,
      operatorId: session.operatorId,
      planHash: plan.planHash,
      result: plan,
      state: plan.simulation.state === "PASSED" ? "PASSED" : "FAILED",
    });
    if (!plan.approval.enabled || plan.simulation.state !== "PASSED") {
      await markLaunchAttemptFailed({
        attemptId: attempt.id,
        detail: {
          reasons: plan.approval.reasons,
          simulation: plan.simulation,
        },
        operatorId: session.operatorId,
      });
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "The refreshed transaction did not pass simulation. No wallet signature was requested.",
        { retryable: true, status: 409 },
      );
    }
    const ready = await markLaunchAttemptReady({
      attemptId: attempt.id,
      operatorId: session.operatorId,
      plan,
    });
    return Response.json(approvalPayload(ready), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (attempt && operatorId !== null && attempt.status === "PREPARING") {
      await markLaunchAttemptFailed({
        attemptId: attempt.id,
        detail: { message: error instanceof Error ? error.message : "Launch preparation failed." },
        operatorId,
      }).catch(() => undefined);
    }
    if (error instanceof ZodError) {
      return integrationErrorResponse(
        new IntegrationError("INVALID_RESPONSE", "The wallet approval request is invalid.", {
          retryable: false,
          status: 400,
        }),
      );
    }
    return integrationErrorResponse(error);
  }
}
