import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { SiteHeader, SiteFooter } from '@/components/chrome';

export const metadata: Metadata = {
  metadataBase: new URL('https://snae.example'),
  title: { default: 'Snae — real people, proven live', template: '%s · Snae' },
  description:
    'Paid, private conversations with verified creators. Every session is proven live by the creator herself, or you get your money back.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Snae — real people, proven live',
    description: 'No chatters. No bots. Guaranteed.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#08070C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Space+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-verified focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
