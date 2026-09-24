import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/manrope";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Continuity — Lifecycle safety for stock-quoted markets",
    template: "%s · Continuity",
  },
  description:
    "Lifecycle controls for ClawPump agents and Meteora DBC markets built around tokenized-stock quote assets.",
  metadataBase: new URL("https://continuity.finance"),
  openGraph: {
    title: "Continuity — Lifecycle safety for stock-quoted markets",
    description:
      "Verify issuer events, attest DBC quote rails, and hold managed actions when an instrument changes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
