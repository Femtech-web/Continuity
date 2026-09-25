import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mainnet lifecycle evidence",
  description: "Inspect source proof and exact mint identities before market action.",
};

export default function MainnetEvidencePage() {
  redirect("/app/markets/spacex/evidence");
}
