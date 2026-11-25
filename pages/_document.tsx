import {Html, Head, Main, NextScript} from 'next/document';

// Load the brand fonts (Inter for body, Space Grotesk for headings) from Google
// Fonts, linked here in the document head with preconnect hints to keep the
// extra round-trip cheap. `next/font` is available now that the site is on Next
// 14 and would self-host these instead; moving to it is a separate change,
// since it alters how the fonts are fetched and rendered.
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
                <link rel="preconnect" href="https://fonts.googleapis.com"/>
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <body>
                <Main/>
                <NextScript/>
            </body>
        </Html>
    );
}
