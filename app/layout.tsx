import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const isProd = process.env.NODE_ENV === "production"
const basePath = isProd ? "/smart-classroom-attendance" : ""

export const metadata: Metadata = {
  title: 'AttendEase - Smart Classroom Attendance',
  description: 'Smart Classroom Attendance Management System for college classes',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: `${basePath}/icon-light-32x32.png`,
        media: '(prefers-color-scheme: light)',
      },
      {
        url: `${basePath}/icon-dark-32x32.png`,
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: `${basePath}/icon.svg`,
        type: 'image/svg+xml',
      },
    ],
    apple: `${basePath}/apple-icon.png`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Script id="strip-bis-attr" strategy="beforeInteractive">
          {`(() => {
  const stripBisAttr = () => {
    document.querySelectorAll('[bis_skin_checked]').forEach((element) => {
      element.removeAttribute('bis_skin_checked');
    });
  };

  stripBisAttr();

  const observer = new MutationObserver(() => {
    stripBisAttr();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['bis_skin_checked'],
  });

  window.addEventListener('load', () => {
    stripBisAttr();
    observer.disconnect();
  }, { once: true });
})();`}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
