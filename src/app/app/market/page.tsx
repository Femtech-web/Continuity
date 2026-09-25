import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mainnet market",
  description: "Inspect a quote rail with live, read-only Solana mint provenance.",
};

export default function MainnetMarketPage() {
  redirect("/app/launch");
}
