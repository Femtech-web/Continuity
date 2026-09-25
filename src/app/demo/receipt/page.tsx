import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Decision receipt",
  description: "Inspect and export the deterministic quote-rail decision receipt.",
};

export default function DemoReceiptPage() {
  redirect("/demo/activity");
}
