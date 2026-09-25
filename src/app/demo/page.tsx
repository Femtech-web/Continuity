import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Wallet-free lifecycle replay",
  description:
    "Replay a deterministic quote-asset lifecycle event without connecting a wallet.",
};

export default function DemoPage() {
  redirect("/demo/markets");
}
