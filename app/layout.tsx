import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

/**
 * Three faces, three jobs — self-hosted by next/font, so no request ever leaves for a
 * font CDN (which also keeps a strict CSP happy).
 *
 *   Space Grotesk — display. Slightly mechanical, tight tracking. Instrument-panel voice.
 *   Inter         — body. Gets out of the way.
 *   JetBrains Mono— UUIDs, lot numbers, quantities, column heads, status chips.
 *
 * The mono is not decoration. A unit id is 36 characters that an operator compares by
 * eye against a printed box; a proportional face makes that materially harder, and
 * tabular figures are the only way a column of quantities lines up.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Medical Supply Web Project",
  description:
    "Drug licensing, medicine unit serialization, custody transfer, and public authenticity verification.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
