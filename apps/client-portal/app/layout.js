import './globals.css';
import { BRAND } from '@/lib/config';
export const metadata = {
  title: { default: BRAND.name, template: `%s | ${BRAND.name}` },
  description: 'Your Kinexis website, search, and campaign performance in one clear view.',
  metadataBase: new URL('https://portal.kinexisdigital.com'),
  // This host is a private client workspace, not an acquisition website.
  // Login/register remain crawlable so crawlers can read the noindex directive.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true }
  },
  icons: {
    icon: '/kinexis-client-portal-assets/assets/logo/favicon.svg',
    apple: '/kinexis-client-portal-assets/assets/logo/app-icon-180.png'
  }
};
export default function RootLayout({ children }) {
  return (<html lang="en"><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&display=swap" />
  </head><body>{children}</body></html>);
}
