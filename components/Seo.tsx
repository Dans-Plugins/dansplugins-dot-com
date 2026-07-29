import Head from 'next/head';
import {useRouter} from 'next/router';
import React from 'react';
import {absoluteUrl, canonicalPath, socialImageUrl} from '../utils/seo';

// Shared per-page document metadata: title, description, canonical URL, and
// Open Graph / Twitter card tags so browser tabs, search engines, and shared
// links (Discord, social) all show meaningful information. Render once near the
// top of each page.
const SITE_NAME = "Dan's Plugins Community";
const DEFAULT_DESCRIPTION =
    "Free, open-source plugins for Minecraft servers — Medieval Factions and a catalogue of complementary plugins, all developed in the open and free to use.";
// The site's own origin, shared with services/visitService.ts. Documented in
// CONFIG.md. Read once at module scope rather than through a getter (as
// visitService does for stubbing in tests): Next.js inlines NEXT_PUBLIC_* at
// build time, and the canonical URL never varies within a running build.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
// Branded 1200x630 card served from public/. Shown as the preview image
// whenever a dansplugins.com link is shared (Discord above all, which is where
// the community lives). The dimensions are the size Open Graph consumers
// expect for a large card, and are declared below so scrapers can reserve the
// right space before the image loads.
const DEFAULT_SOCIAL_IMAGE = '/social-card.png';
const SOCIAL_IMAGE_WIDTH = '1200';
const SOCIAL_IMAGE_HEIGHT = '630';
const DEFAULT_SOCIAL_IMAGE_ALT =
    "Dan's Plugins Community — free, open-source plugins for Minecraft servers";

interface SeoProps {
    // Page-specific title; the site name is appended automatically. Omit on the
    // home page to use the site name alone.
    title?: string;
    description?: string;
    // Path the canonical URL and og:url should point at. Defaults to the current
    // route. Pages that resolve a dynamic segment on the client (for example
    // /u/[username]) should pass the concrete path once they know it. Pass null
    // to emit no canonical URL at all — error pages stand in for a URL that is
    // not a real page, so they must not claim one.
    path?: string | null;
    // Preview image for shared links. Defaults to the site-wide social card;
    // pass a path under public/ or an absolute URL to override it for one page,
    // or null to emit no image at all.
    image?: string | null;
    // Alt text for the preview image. Only meaningful alongside a custom
    // `image` — the default card carries its own description.
    imageAlt?: string;
}

const Seo: React.FC<SeoProps> = ({title, description, path, image, imageAlt}) => {
    const {asPath} = useRouter();
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const resolvedPath = path === null ? null : canonicalPath(path ?? asPath);
    const url = resolvedPath === null ? null : absoluteUrl(BASE_URL, resolvedPath);
    const usingDefaultImage = image === undefined;
    const imageUrl = socialImageUrl(BASE_URL, usingDefaultImage ? DEFAULT_SOCIAL_IMAGE : image);
    const alt = imageAlt ?? (usingDefaultImage ? DEFAULT_SOCIAL_IMAGE_ALT : undefined);
    return (
        <Head>
            <title>{fullTitle}</title>
            <meta name="description" content={desc}/>
            {url ? <link rel="canonical" href={url}/> : null}
            <meta property="og:title" content={fullTitle}/>
            <meta property="og:description" content={desc}/>
            <meta property="og:type" content="website"/>
            <meta property="og:site_name" content={SITE_NAME}/>
            {url ? <meta property="og:url" content={url}/> : null}
            {imageUrl ? <meta property="og:image" content={imageUrl}/> : null}
            {/* Only the site card's dimensions are known here; a page supplying
                its own image would be misdescribed by hard-coded values. */}
            {imageUrl && usingDefaultImage ? <meta property="og:image:width" content={SOCIAL_IMAGE_WIDTH}/> : null}
            {imageUrl && usingDefaultImage ? <meta property="og:image:height" content={SOCIAL_IMAGE_HEIGHT}/> : null}
            {imageUrl && alt ? <meta property="og:image:alt" content={alt}/> : null}
            <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'}/>
            <meta name="twitter:title" content={fullTitle}/>
            <meta name="twitter:description" content={desc}/>
            {imageUrl ? <meta name="twitter:image" content={imageUrl}/> : null}
            {imageUrl && alt ? <meta name="twitter:image:alt" content={alt}/> : null}
        </Head>
    );
};

export default Seo;
