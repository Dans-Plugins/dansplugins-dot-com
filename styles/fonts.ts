import {Inter, Space_Grotesk} from 'next/font/google';

// The brand fonts, self-hosted by next/font: the woff2 files are downloaded
// from Google Fonts when the site is built and served from /_next/static, so a
// visitor's browser never contacts fonts.googleapis.com or fonts.gstatic.com.
// next/font also generates a fallback face with size-adjust and matching
// metrics, so the swap from the fallback to the real font moves less text.
// Same families and weights as the old Google Fonts stylesheet link.
export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

export const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    display: 'swap',
});
