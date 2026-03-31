import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEVCON Marketing Agent",
  description: "AI-powered marketing workflow for DEVCON Philippines",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}