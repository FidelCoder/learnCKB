import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cipherpost · pay to open',
  description: 'Seal a page, sell the ransom invoice, open it only after the Fiber payment settles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
