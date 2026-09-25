import { createHash } from "node:crypto";
import { Connection, Transaction } from "@solana/web3.js";
import { z, ZodError } from "zod";
import { assertSameOrigin, requireOperatorSession } from "@/auth/operator-session";
import { readServerEnvironment } from "@/config/server-environment";
import { IntegrationError, integrationErrorResponse } from "@/integrations/integration-error";
import {
  confirmLaunchAndRegisterMarket,
  getLaunchAttempt,
  markLaunchAttemptFailed,
  markLaunchAttemptSubmitted,
} from "@/persistence/launch-store";
import { getProtectedMarketDraft } from "@/persistence/protected-market-store";
import { verifySolanaMessageSignature } from "@/transactions/solana-message-signature";

export const dynamic = "force-dynamic";

const confirmationSchema = z.object({
  attemptId: z.string().uuid(),
  signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{80,100}$/),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireOperatorSession();
    const input = confirmationSchema.parse(await request.json());
    const { draftId } = await context.params;
    const draft = await getProtectedMarketDraft(draftId, session.operatorId);
    if (!draft) {
      throw new IntegrationError("INVALID_RESPONSE", "Protected-market draft not found.", {
        retryable: false,
        status: 404,
      });
    }
    let attempt = await getLaunchAttempt({
      attemptId: input.attemptId,
      operatorId: session.operatorId,
    });
    if (!attempt || attempt.draftId !== draft.id) {
      throw new IntegrationError("INVALID_RESPONSE", "Launch attempt not found.", {
        retryable: false,
        status: 404,
      });
    }
    if (attempt.status === "READY") {
      if (!attempt.serializedTransaction) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "The reviewed launch transaction is no longer available.",
          { retryable: true, status: 409 },
        );
      }
      const reviewedTransaction = Transaction.from(
        Buffer.from(attempt.serializedTransaction, "base64"),
      );
      if (!verifySolanaMessageSignature({
        message: reviewedTransaction.serializeMessage(),
        signature: input.signature,
        walletAddress: session.walletAddress,
      })) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "The submitted signature does not approve the reviewed launch message.",
          { retryable: false, status: 409 },
        );
      }
      attempt = await markLaunchAttemptSubmitted({
        attemptId: attempt.id,
        operatorId: session.operatorId,
        signature: input.signature,
      });
    } else if (
      attempt.status !== "SUBMITTED" &&
      attempt.status !== "CONFIRMED"
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        `The launch attempt is ${attempt.status.toLowerCase()} and cannot be confirmed.`,
        { retryable: false, status: 409 },
      );
    }
    if (
      attempt.transactionSignature !== input.signature ||
      !attempt.baseMint ||
      !attempt.configAddress ||
      !attempt.quoteMint ||
      !attempt.virtualPoolAddress
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "The submitted signature does not match the reviewed launch attempt.",
        { retryable: false, status: 409 },
      );
    }

    const environment = readServerEnvironment();
    const connection = new Connection(environment.solana.rpcUrl, "confirmed");
    const [statusResult, transaction] = await Promise.all([
      connection.getSignatureStatuses([input.signature], { searchTransactionHistory: true }),
      connection.getTransaction(input.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      }),
    ]);
    const status = statusResult.value[0];
    if (!status || !transaction) {
      return Response.json(
        { attemptId: attempt.id, signature: input.signature, status: "SUBMITTED" },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (status.err || transaction.meta?.err) {
      await markLaunchAttemptFailed({
        attemptId: attempt.id,
        detail: { chainError: status.err ?? transaction.meta?.err },
        operatorId: session.operatorId,
      });
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "Solana confirmed that the launch transaction failed.",
        { retryable: false, status: 409 },
      );
    }
    const message = transaction.transaction.message;
    const messageHash = createHash("sha256")
      .update(message.serialize())
      .digest("hex");
    if (
      messageHash !== attempt.messageHash ||
      message.recentBlockhash !== attempt.recentBlockhash
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "The confirmed transaction message does not match the reviewed launch.",
        { retryable: false, status: 409 },
      );
    }
    const accountKeys = message.staticAccountKeys.map((key) => key.toBase58());
    const requiredAccounts = [
      session.walletAddress,
      attempt.baseMint,
      attempt.configAddress,
      attempt.quoteMint,
      attempt.virtualPoolAddress,
    ];
    if (!requiredAccounts.every((address) => accountKeys.includes(address))) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "The confirmed transaction does not match the reviewed market accounts.",
        { retryable: false, status: 409 },
      );
    }
    const operatorAccount = accountKeys[0];
    if (
      message.header.numRequiredSignatures < 1 ||
      operatorAccount !== session.walletAddress
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "The operator wallet is not the confirmed transaction signer.",
        { retryable: false, status: 409 },
      );
    }
    const registration = await confirmLaunchAndRegisterMarket({
      attempt,
      operatorAgentId: draft.operatorAgentId,
      quoteSymbol: draft.quoteSymbol,
    });
    return Response.json({
      attemptId: attempt.id,
      marketId: registration.marketId,
      signature: input.signature,
      status: "CONFIRMED",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return integrationErrorResponse(
        new IntegrationError("INVALID_RESPONSE", "The confirmation payload is invalid.", {
          retryable: false,
          status: 400,
        }),
      );
    }
    return integrationErrorResponse(error);
  }
}
