import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Market replay",
  description: "Inspect the affected DBC quote rail and successor configuration.",
};

export default function DemoMarketPage() {
  redirect("/demo/launch");
}
