import type { Metadata } from "next";
import { Fustat } from "next/font/google";

import "./globals.css";

const fustat = Fustat({
  variable: "--font-fustat",
  display: "swap",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  title: {
    template: "%s | Handsell",
    default: "Handsell - Portal do Cliente",
  },
  description: "Handsell - Portal do Cliente",
  openGraph: {
    images: "/og-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${fustat.variable} antialiased`}>{children}</body>
    </html>
  );
}
