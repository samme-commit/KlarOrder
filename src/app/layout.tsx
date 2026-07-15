import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KlarOrder",
    template: "%s | KlarOrder",
  },
  description:
    "Dokumentera och få digitalt godkännande för ändrings- och tilläggsarbeten.",
  applicationName: "KlarOrder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}