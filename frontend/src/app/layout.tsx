import type { Metadata } from "next";
import { DM_Sans, Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";

// Inter (UI) + Space Grotesk (headings and figures). The other two are only used when a workspace theme selects them.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "FinScore AI by 5nance",
  description: "Your AI Financial Operating System: understand, predict and improve your financial life.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Font variables live on <html> so a workspace theme on :root can point --tenant-sans at them.
  return (
    <html lang="en-IN" className={`${inter.variable} ${grotesk.variable} ${jakarta.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
