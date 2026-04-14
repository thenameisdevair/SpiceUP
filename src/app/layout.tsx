import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ToastContainer";
import { Providers } from "@/providers/Providers";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "SpiceUP — Group Money on Starknet",
    template: "%s | SpiceUP",
  },
  description:
    "Group expenses and remittance on Starknet. Split costs, send support home, and move money with less friction.",
  keywords: [
    "SpiceUP",
    "Starknet",
    "group payments",
    "group expenses",
    "remittance",
    "crypto",
    "Tongo",
  ],
  authors: [{ name: "SpiceUP Team" }],
  openGraph: {
    title: "SpiceUP — Group Money on Starknet",
    description:
      "Split group expenses and send support home with a Starknet experience built for real use.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <main className="min-h-screen bg-spiceup-bg text-spiceup-text-primary">
            {children}
          </main>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
