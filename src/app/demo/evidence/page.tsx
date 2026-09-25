import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Lifecycle evidence",
  description: "Inspect the source-backed lifecycle manifest and exact mint identities.",
};

export default function DemoEvidencePage() {
  redirect("/demo/markets/spacex/evidence");
}
