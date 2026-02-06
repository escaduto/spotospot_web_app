import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/src/styles/globals.css";
import { AuthProviderWrapper } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpotoSpot — Plan Your Perfect Trip, Spot by Spot",
  description:
    "Discover curated day-trip plans, create AI-powered itineraries, collaborate with travelers, and explore the world together.",
  openGraph: {
    title: "SpotoSpot — Plan Your Perfect Trip, Spot by Spot",
    description:
      "Discover curated day-trip plans, create AI-powered itineraries, collaborate with travelers, and explore the world together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}
