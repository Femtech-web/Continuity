import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";

const cluster =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "devnet"
    ? ("solana:devnet" as const)
    : ("solana:mainnet" as const);

const rpcUrl =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  (cluster === "solana:devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com");

export const solanaClient = createClient()
  .use(
    walletSigner({
      autoConnect: true,
      chain: cluster,
      storageKey: "continuity-wallet",
    }),
  )
  .use(solanaRpc({ rpcUrl }));

export type ContinuitySolanaClient = Awaited<typeof solanaClient>;

export const solanaNetworkLabel =
  cluster === "solana:devnet" ? "Solana devnet" : "Solana mainnet";
