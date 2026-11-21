import type { Metadata } from "next";
import localFont from "next/font/local";
import { CONNECT_METADATA_BASE } from "@/lib/seo-metadata";
import "./globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  display: "swap",
});

const poppins = localFont({
  src: [
    { path: "./fonts/poppins-latin-600.woff2", weight: "600" },
    { path: "./fonts/poppins-latin-700.woff2", weight: "700" },
    { path: "./fonts/poppins-latin-800.woff2", weight: "800" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: CONNECT_METADATA_BASE,
  title: {
    default: "KINEXIS Connect",
    template: "%s | KINEXIS Connect",
  },
  description: "Turn missed calls into conversations.",
  openGraph: {
    title: "KINEXIS Connect",
    description: "Turn missed calls into conversations.",
    images: [{ url: "/assets/connect/brand/connect-social.webp", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KINEXIS Connect",
    description: "Turn missed calls into conversations.",
    images: ["/assets/connect/brand/connect-social.webp"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable}`}>{children}</body>
    </html>
  );
}
