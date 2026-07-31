import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CKB Hash Lock | FidelCoder",
  description: "A local-devnet workbench for the CKB simple lock tutorial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
