import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mainnet console",
  description:
    "Inspect lifecycle manifests and stock-quoted market controls on Solana mainnet.",
};

export default function AppPage() {
  redirect("/app/markets");
}
