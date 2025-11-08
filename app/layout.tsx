import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Funding Rate Arbitrage Dashboard",
  description: "Scans funding-rate arbitrage between Lighter and Paradex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
