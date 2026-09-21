import type { Metadata } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Church Events | مناسبات الكنيسة',
  description: 'Multilingual church events and interactive seating reservation system with real-time updates and admin management in Arabic, English, and French.',
  openGraph: {
    title: 'Church Events | مناسبات الكنيسة',
    description: 'Multilingual church events and interactive seating reservation system with real-time updates and admin management in Arabic, English, and French.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
