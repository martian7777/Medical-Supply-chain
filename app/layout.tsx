import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Supply Web Project",
  description:
    "Drug licensing, medicine unit serialization, custody transfer, and public authenticity verification.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
