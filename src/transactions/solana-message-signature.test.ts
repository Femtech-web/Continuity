import assert from "node:assert/strict";
import test from "node:test";
import { getBase58Decoder } from "@solana/kit";
import {
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { verifySolanaMessageSignature } from "./solana-message-signature.ts";

test("binds a Solana signature to the exact reviewed message and operator", () => {
  const operator = Keypair.generate();
  const recipient = Keypair.generate().publicKey;
  const transaction = new Transaction({
    feePayer: operator.publicKey,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
  }).add(SystemProgram.transfer({
    fromPubkey: operator.publicKey,
    lamports: 1,
    toPubkey: recipient,
  }));
  transaction.partialSign(operator);
  const signatureBytes = transaction.signatures[0]?.signature;
  assert.ok(signatureBytes);
  const signature = getBase58Decoder().decode(signatureBytes);
  const message = transaction.serializeMessage();

  assert.equal(verifySolanaMessageSignature({
    message,
    signature,
    walletAddress: operator.publicKey.toBase58(),
  }), true);
  assert.equal(verifySolanaMessageSignature({
    message: Uint8Array.from([...message, 0]),
    signature,
    walletAddress: operator.publicKey.toBase58(),
  }), false);
  assert.equal(verifySolanaMessageSignature({
    message,
    signature,
    walletAddress: Keypair.generate().publicKey.toBase58(),
  }), false);
});
