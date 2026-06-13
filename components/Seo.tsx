import Head from 'next/head';
import React from 'react';

// Shared per-page document metadata: title, description, and Open Graph /
// Twitter card tags so browser tabs, search engines, and shared links (Discord,
// social) all show meaningful information. Render once near the top of each page.
const SITE_NAME = "Dan's Plugins Community";
const DEFAULT_DESCRIPTION =
    "Free, open-source plugins for Minecraft servers — Medieval Factions and a catalogue of complementary plugins, all developed in the open and free to use.";

interface SeoProps {
    // Page-specific title; the site name is appended automatically. Omit on the
    // home page to use the site name alone.
    title?: string;
    description?: string;
}

const Seo: React.FC<SeoProps> = ({title, description}) => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const desc = description ?? DEFAULT_DESCRIPTION;
    return (
        <Head>
            <title>{fullTitle}</title>
            <meta name="description" content={desc}/>
            <meta property="og:title" content={fullTitle}/>
            <meta property="og:description" content={desc}/>
            <meta property="og:type" content="website"/>
            <meta property="og:site_name" content={SITE_NAME}/>
            <meta name="twitter:card" content="summary"/>
            <meta name="twitter:title" content={fullTitle}/>
            <meta name="twitter:description" content={desc}/>
        </Head>
    );
};

export default Seo;
