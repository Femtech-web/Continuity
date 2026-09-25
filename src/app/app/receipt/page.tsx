import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mainnet decision receipt",
  description: "Inspect portable proof for the current quote-rail decision.",
};

export default function MainnetReceiptPage() {
  redirect("/app/activity");
}
