import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/manrope";
import { Providers } from "./providers";
import "./globals.css";

function metadataBase(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return new URL(configuredUrl);

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`);

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  title: {
    default: "Continuity — Lifecycle safety for stock-quoted markets",
    template: "%s · Continuity",
  },
  description:
    "Lifecycle controls for ClawPump agents and Meteora DBC markets built around tokenized-stock quote assets.",
  metadataBase: metadataBase(),
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
