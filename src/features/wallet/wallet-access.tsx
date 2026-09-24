"use client";

import { address } from "@solana/kit";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWallets,
} from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ProductIcon } from "@/components/product-icon";
import {
  solanaNetworkLabel,
  type ContinuitySolanaClient,
} from "./solana-client";
import styles from "./wallet-access.module.css";

const trackedMints = [
  {
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    symbol: "SPACEX",
  },
  {
    mint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    symbol: "SPCXx",
  },
] as const;

type DialogIntent = "account" | "scan";
type ToastTone = "neutral" | "success" | "error";

interface ToastState {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

interface WalletAccessContextValue {
  readonly address: string | null;
  readonly isReady: boolean;
  readonly isScanning: boolean;
  readonly openAccount: () => void;
  readonly scanWallet: () => void;
}

const WalletAccessContext = createContext<WalletAccessContextValue | null>(null);
const subscribeToHydration = () => () => undefined;

function abbreviateAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The wallet request did not complete.";
}

export function WalletAccessProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const client = useClient<ContinuitySolanaClient>();
  const connected = useConnectedWallet(client);
  const wallets = useWallets(client);
  const isWalletReady = useIsWalletReady(client);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const isReady = hasHydrated && isWalletReady;
  const connect = useConnect(client);
  const disconnect = useDisconnect(client);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialogIntent, setDialogIntent] = useState<DialogIntent>("account");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = "neutral") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isDialogOpen && !dialog.open) dialog.showModal();
    if (!isDialogOpen && dialog.open) dialog.close();
  }, [isDialogOpen]);

  const closeDialog = useCallback(() => setIsDialogOpen(false), []);

  const openAccount = useCallback(() => {
    setDialogIntent("account");
    setIsDialogOpen(true);
  }, []);

  const connectWallet = async (wallet: (typeof wallets)[number]) => {
    try {
      await connect.dispatchAsync(wallet);
      closeDialog();
      showToast(`${wallet.name} connected.`, "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect.dispatchAsync();
      closeDialog();
      showToast("Wallet disconnected.");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const copyAddress = async () => {
    if (!connected) return;

    try {
      await navigator.clipboard.writeText(connected.account.address);
      showToast("Wallet address copied.", "success");
    } catch {
      showToast("Could not copy the wallet address.", "error");
    }
  };

  const scanConnectedWallet = useCallback(async () => {
    if (!connected || isScanning) return;

    setIsScanning(true);
    try {
      const balances = await Promise.all(
        trackedMints.map(async (instrument) => {
          const response = await client.rpc
            .getTokenAccountsByOwner(
              address(connected.account.address),
              { mint: address(instrument.mint) },
              { commitment: "confirmed", encoding: "jsonParsed" },
            )
            .send();

          const amount = response.value.reduce(
            (total, tokenAccount) =>
              total +
              Number(tokenAccount.account.data.parsed.info.tokenAmount.uiAmountString),
            0,
          );

          return { ...instrument, amount };
        }),
      );
      const positions = balances.filter((position) => position.amount > 0);

      if (positions.length === 0) {
        showToast(
          "Scan complete. No monitored lifecycle positions were found in this wallet.",
        );
      } else {
        const summary = positions
          .map((position) => `${position.amount} ${position.symbol}`)
          .join(" and ");
        showToast(`Scan complete. Found ${summary}.`, "success");
      }
    } catch {
      showToast(
        "The wallet is connected, but the Solana RPC scan could not complete. Try again.",
        "error",
      );
    } finally {
      setIsScanning(false);
    }
  }, [client, connected, isScanning, showToast]);

  const scanWallet = useCallback(() => {
    if (!isReady || isScanning) return;
    if (!connected) {
      setDialogIntent("scan");
      setIsDialogOpen(true);
      return;
    }
    void scanConnectedWallet();
  }, [connected, isReady, isScanning, scanConnectedWallet]);

  const contextValue = useMemo<WalletAccessContextValue>(
    () => ({
      address: connected?.account.address ?? null,
      isReady,
      isScanning,
      openAccount,
      scanWallet,
    }),
    [connected?.account.address, isReady, isScanning, openAccount, scanWallet],
  );

  return (
    <WalletAccessContext.Provider value={contextValue}>
      {children}

      <dialog
        aria-labelledby="wallet-dialog-title"
        className={styles.dialog}
        onCancel={closeDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        ref={dialogRef}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeader}>
            <div>
              <span>{solanaNetworkLabel}</span>
              <h2 id="wallet-dialog-title">
                {connected
                  ? "Connected wallet"
                  : dialogIntent === "scan"
                    ? "Connect to scan"
                    : "Connect a wallet"}
              </h2>
            </div>
            <button
              aria-label="Close wallet dialog"
              className={styles.iconButton}
              onClick={closeDialog}
              type="button"
            >
              <ProductIcon name="close" />
            </button>
          </div>

          {connected ? (
            <div className={styles.accountView}>
              <div className={styles.accountIdentity}>
                <Image
                  alt=""
                  height={42}
                  src={connected.wallet.icon}
                  unoptimized
                  width={42}
                />
                <div>
                  <strong>{connected.wallet.name}</strong>
                  <code>{abbreviateAddress(connected.account.address)}</code>
                </div>
                <span className={styles.connectedStatus}>Connected</span>
              </div>
              <p>
                Continuity can read public token accounts for monitoring. A
                signature is requested only when you approve an onchain action.
              </p>
              <div className={styles.accountActions}>
                <button onClick={() => void copyAddress()} type="button">
                  <ProductIcon name="copy" /> Copy address
                </button>
                <button onClick={() => void disconnectWallet()} type="button">
                  <ProductIcon name="disconnect" /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.connectView}>
              <p>
                The product remains available in read-only mode. Connect only
                to scan your own positions, save a policy, or approve an action.
              </p>

              {!isReady ? (
                <div className={styles.walletListSkeleton} aria-label="Finding wallets">
                  <span />
                  <span />
                </div>
              ) : wallets.length > 0 ? (
                <div className={styles.walletList}>
                  {wallets.map((wallet) => (
                    <button
                      disabled={connect.isRunning}
                      key={wallet.name}
                      onClick={() => void connectWallet(wallet)}
                      type="button"
                    >
                      <Image
                        alt=""
                        height={34}
                        src={wallet.icon}
                        unoptimized
                        width={34}
                      />
                      <span>
                        <strong>{wallet.name}</strong>
                        <small>
                          {connect.isRunning ? "Waiting for wallet" : "Wallet Standard"}
                        </small>
                      </span>
                      <ProductIcon name="arrow-right" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyWallets}>
                  <span className={styles.emptyIcon}>
                    <ProductIcon name="wallet" />
                  </span>
                  <div>
                    <strong>No compatible wallet detected</strong>
                    <p>
                      Install a Solana Wallet Standard wallet, then refresh this page.
                    </p>
                  </div>
                </div>
              )}

              <small className={styles.securityNote}>
                Connecting shares your public address. It never gives Continuity
                custody of your assets.
              </small>
            </div>
          )}
        </div>
      </dialog>

      {toast ? (
        <div
          className={`${styles.toast} ${styles[`toast-${toast.tone}`]}`}
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <ProductIcon name={toast.tone === "error" ? "warning" : "check"} />
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)} type="button">
            <ProductIcon name="close" />
          </button>
        </div>
      ) : null}
    </WalletAccessContext.Provider>
  );
}

export function useWalletAccess() {
  const context = useContext(WalletAccessContext);
  if (!context) {
    throw new Error("WalletAccessButton must be rendered inside WalletAccessProvider.");
  }
  return context;
}

interface WalletAccessButtonProps {
  readonly variant: "compact" | "scan";
}

export function WalletAccessButton({ variant }: WalletAccessButtonProps) {
  const wallet = useWalletAccess();

  if (!wallet.isReady) {
    return (
      <span
        aria-label="Restoring wallet connection"
        className={`${styles.triggerSkeleton} ${styles[`triggerSkeleton-${variant}`]}`}
      />
    );
  }

  if (variant === "scan") {
    return (
      <button
        className={styles.scanTrigger}
        disabled={wallet.isScanning}
        onClick={wallet.scanWallet}
        type="button"
      >
        {wallet.isScanning
          ? "Scanning positions"
          : wallet.address
            ? "Scan this wallet"
            : "Connect to scan"}
        <ProductIcon name={wallet.isScanning ? "clock" : "arrow-right"} />
      </button>
    );
  }

  return (
    <button className={styles.accountTrigger} onClick={wallet.openAccount} type="button">
      <ProductIcon name="wallet" />
      {wallet.address ? abbreviateAddress(wallet.address) : "Connect wallet"}
    </button>
  );
}
