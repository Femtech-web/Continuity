"use client";

import { getBase58Decoder } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient, useSignAndSendTransaction } from "@solana/react";
import { useState } from "react";
import {
  solanaChain,
  type ContinuitySolanaClient,
} from "@/features/wallet/solana-client";
import styles from "./dashboard.module.css";

type ConnectedWalletState = NonNullable<
  ReturnType<ContinuitySolanaClient["wallet"]["getState"]>["connected"]
>;

type ApprovalState =
  | { readonly status: "idle" }
  | { readonly message: string; readonly status: "preparing" | "signing" | "confirming" }
  | { readonly message: string; readonly status: "error" }
  | {
      readonly marketId: string | null;
      readonly signature: string;
      readonly status: "submitted" | "confirmed";
    };

interface ApprovalPayload {
  readonly attemptId: string;
  readonly serializedTransaction: string;
}

interface ConfirmationPayload {
  readonly attemptId?: string;
  readonly error?: { readonly message?: string };
  readonly marketId?: string;
  readonly signature?: string;
  readonly status?: "CONFIRMED" | "SUBMITTED";
}

function responseMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return fallback;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function explorerUrl(signature: string) {
  const cluster = solanaChain === "solana:devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${signature}${cluster}`;
}

async function wait(milliseconds: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function ConnectedLaunchApproval({
  account,
  draftId,
  marketLabel,
}: Readonly<{
  account: ConnectedWalletState["account"];
  draftId: string;
  marketLabel: string;
}>) {
  const signAndSendTransaction = useSignAndSendTransaction(account, solanaChain);
  const [state, setState] = useState<ApprovalState>({ status: "idle" });

  async function confirm(attemptId: string, signature: string) {
    for (let poll = 0; poll < 8; poll += 1) {
      const response = await fetch(
        `/api/v1/protected-market-drafts/${draftId}/confirmation`,
        {
          body: JSON.stringify({ attemptId, signature }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json()) as ConfirmationPayload;
      if (response.ok && payload.status === "CONFIRMED") {
        setState({
          marketId: payload.marketId ?? null,
          signature,
          status: "confirmed",
        });
        return;
      }
      if (response.status !== 202) {
        throw new Error(
          payload.error?.message ?? "Continuity could not verify the submitted launch.",
        );
      }
      if (poll < 7) await wait(1_500);
    }
    setState({ marketId: null, signature, status: "submitted" });
  }

  async function approve() {
    setState({
      message: "Rebuilding the reviewed transaction with a fresh Solana blockhash.",
      status: "preparing",
    });
    try {
      const response = await fetch(
        `/api/v1/protected-market-drafts/${draftId}/approval`,
        {
          body: JSON.stringify({
            authority: account.address,
            idempotencyKey: crypto.randomUUID(),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          responseMessage(payload, "Continuity could not prepare the final transaction."),
        );
      }
      const approval = payload as ApprovalPayload;
      if (!approval.attemptId || !approval.serializedTransaction) {
        throw new Error("The final transaction payload is incomplete.");
      }

      setState({
        message: `Review ${marketLabel} in your wallet. Nothing is sent unless you approve.`,
        status: "signing",
      });
      const { signature } = await signAndSendTransaction({
        transaction: decodeBase64(approval.serializedTransaction),
      });
      const signatureBase58 = getBase58Decoder().decode(signature);
      setState({
        message: "Transaction submitted. Waiting for Solana confirmation.",
        status: "confirming",
      });
      await confirm(approval.attemptId, signatureBase58);
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The wallet approval did not complete.",
        status: "error",
      });
    }
  }

  const working =
    state.status === "preparing" ||
    state.status === "signing" ||
    state.status === "confirming";

  return (
    <div className={styles.launchApprovalAction}>
      {state.status === "confirmed" || state.status === "submitted" ? (
        <div className={styles.launchApprovalResult} role="status">
          <div>
            <strong>
              {state.status === "confirmed"
                ? "Market launched and monitoring registered."
                : "Launch submitted. Confirmation is still pending."}
            </strong>
            <p>
              {state.status === "confirmed"
                ? "Sentinel can now track this exact Meteora market and its stock quote asset."
                : "The transaction is on Solana; Continuity will register it after confirmation."}
            </p>
          </div>
          <a href={explorerUrl(state.signature)} rel="noreferrer" target="_blank">
            View transaction
          </a>
        </div>
      ) : (
        <>
          <div>
            <strong>One explicit wallet approval.</strong>
            <p>
              Continuity rebuilds and simulates a fresh transaction before your wallet
              displays the final Solana request.
            </p>
            {"message" in state ? (
              <small className={state.status === "error" ? styles.launchApprovalError : undefined}>
                {state.message}
              </small>
            ) : null}
          </div>
          <button disabled={working} onClick={() => void approve()} type="button">
            {state.status === "preparing"
              ? "Preparing"
              : state.status === "signing"
                ? "Waiting for wallet"
                : state.status === "confirming"
                  ? "Confirming"
                  : "Approve and launch"}
          </button>
        </>
      )}
    </div>
  );
}

export function LaunchApproval({
  draftId,
  marketLabel,
}: Readonly<{ draftId: string; marketLabel: string }>) {
  const client = useClient<ContinuitySolanaClient>();
  const connected = useConnectedWallet(client);

  if (!connected) {
    return (
      <div className={styles.launchApprovalAction}>
        <div>
          <strong>Connect the operator wallet to continue.</strong>
          <p>The same verified wallet that owns this draft must approve the launch.</p>
        </div>
        <button disabled type="button">Approve and launch</button>
      </div>
    );
  }

  return (
    <ConnectedLaunchApproval
      account={connected.account}
      draftId={draftId}
      marketLabel={marketLabel}
    />
  );
}
