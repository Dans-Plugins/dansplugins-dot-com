import {Html, Head, Main, NextScript} from 'next/document';

// The brand fonts (Inter for body, Space Grotesk for headings) are not linked
// here: next/font self-hosts them (styles/fonts.ts) and pages/_app.tsx applies
// them, so the page needs no Google Fonts stylesheet or preconnects.
export default function Document() {
    return (
        <Html lang="en">
            <Head>
                {/* Site icons, drawn by scripts/site-icons/make_icons.py: the
                    ICO for older browsers and bookmarks, the SVG for everything
                    current, the opaque PNG for iOS home screens, and the
                    manifest for Android. */}
                <link rel="icon" href="/favicon.ico" sizes="48x48"/>
                <link rel="icon" href="/icon.svg" type="image/svg+xml"/>
                <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
                <link rel="manifest" href="/site.webmanifest"/>
                {/* Browser chrome (mobile address bar) in the app bar's colour
                    for each scheme: brand blue in light mode, the dark surface
                    in dark mode (pages/_app.tsx, MuiAppBar). */}
                <meta name="theme-color" media="(prefers-color-scheme: light)" content="#4263eb"/>
                <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#161b22"/>
            </Head>
            <body>
                <Main/>
                <NextScript/>
            </body>
        </Html>
    );
}
