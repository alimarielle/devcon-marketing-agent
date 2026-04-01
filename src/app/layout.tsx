import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEVCON Studios Marketing Agent",
  description: "AI-powered marketing workflow for DEVCON Philippines — generate content for all chapters and platforms.",
  icons: {
    icon: "/devcon_favicon.svg",
    shortcut: "/devcon_favicon.svg",
    apple: "/devcon_favicon.svg",
  },
  openGraph: {
    title: "DEVCON Studios Marketing Agent",
    description: "AI-powered marketing workflow for DEVCON Philippines",
    siteName: "DEVCON Studios",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}