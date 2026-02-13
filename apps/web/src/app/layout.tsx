import type { Metadata } from "next";
import { Fustat } from "next/font/google";

import "./globals.css";

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BRAND_NAME } from "@/lib/metadata";

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
    template: `%s | ${BRAND_NAME}`,
    default: BRAND_NAME,
  },
  description: BRAND_NAME,
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: BRAND_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_NAME,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body className={`${fustat.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
