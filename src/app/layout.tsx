import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ToastContainer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SpiceUP — Private Payments on Starknet",
    template: "%s | SpiceUP",
  },
  description:
    "Privacy-first group payments and remittance on Starknet. Send money privately, split expenses, and earn yield — no gas fees, no seed phrases.",
  keywords: [
    "SpiceUP",
    "Starknet",
    "private payments",
    "group expenses",
    "crypto",
    "ZK proofs",
    "Tongo",
  ],
  authors: [{ name: "SpiceUP Team" }],
  openGraph: {
    title: "SpiceUP — Private Payments on Starknet",
    description:
      "Send money privately, split group expenses, and earn yield. No gas fees, no seed phrases.",
    type: "website",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌶️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <main className="min-h-screen bg-spiceup-bg text-spiceup-text-primary">
          {children}
        </main>
        <ToastContainer />
      </body>
    </html>
  );
}
