import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ages Ago Manager",
  description: "Bulk product editor for Shopify",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
