// Builders for the schema.org JSON-LD a page embeds for search engines (see
// components/Seo.tsx, which renders it). Kept pure and separate from the
// pages — the same split as utils/seo.ts and utils/sitemap.ts — so the
// structured data can be unit-tested without a render.
//
// Only facts the page itself shows are described. In particular a plugin's
// SpigotMC rating is not offered as an `aggregateRating`: search engines ask
// that ratings be collected by the site that marks them up, not copied in from
// another one.

import {absoluteUrl, socialImageUrl} from './seo';
import {resourcePath} from './resources';

export type JsonLd = Record<string, unknown>;

export const SITE_NAME = "Dan's Plugins Community";
export const GITHUB_ORG_URL = 'https://github.com/Dans-Plugins';

// One step of a breadcrumb trail: the name shown and the site-relative path.
export interface Crumb {
    name: string;
    path: string;
}

// The site itself, embedded on the home page so a search engine can tie the
// site name to its origin (the name shown above a result) and to the
// organisation that publishes it.
export const websiteJsonLd = (baseUrl: string): JsonLd => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl(baseUrl, '/'),
    publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl(baseUrl, '/'),
        logo: absoluteUrl(baseUrl, '/icon-512.png'),
        sameAs: [GITHUB_ORG_URL]
    }
});

// A breadcrumb trail, first crumb outermost. Shown by search engines in place
// of the raw URL above a result.
export const breadcrumbJsonLd = (baseUrl: string, crumbs: readonly Crumb[]): JsonLd => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(baseUrl, crumb.path)
    }))
});

export interface PluginFacts {
    slug: string;
    title: string;
    description: string;
    githubLink: string;
    spigotmcLink: string | null;
    // A path under public/ or an absolute URL; null when the plugin has none.
    icon: string | null;
    latestVersion: string | null;
    // ISO timestamps, or null when unknown (the property is then left out).
    firstReleasedAt: string | null;
    lastUpdatedAt: string | null;
    tags: readonly string[];
}

// A plugin's resource page (/resources/[slug]) as a SoftwareApplication: a free
// Minecraft server plugin, with its version, release dates and the places it is
// published.
export const pluginJsonLd = (baseUrl: string, plugin: PluginFacts): JsonLd => {
    const image = socialImageUrl(baseUrl, plugin.icon);
    const sameAs = [plugin.githubLink, plugin.spigotmcLink].filter(
        (link): link is string => typeof link === 'string' && link.trim() !== ''
    );
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: plugin.title,
        description: plugin.description.trim() || undefined,
        url: absoluteUrl(baseUrl, resourcePath(plugin.slug)),
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Minecraft server plugin',
        operatingSystem: 'Minecraft Java Edition server (Spigot, Paper)',
        isAccessibleForFree: true,
        offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
        ...(plugin.latestVersion ? {softwareVersion: plugin.latestVersion} : {}),
        ...(plugin.firstReleasedAt ? {datePublished: plugin.firstReleasedAt} : {}),
        ...(plugin.lastUpdatedAt ? {dateModified: plugin.lastUpdatedAt} : {}),
        ...(image ? {image} : {}),
        ...(plugin.tags.length > 0 ? {keywords: plugin.tags.join(', ')} : {}),
        ...(sameAs.length > 0 ? {sameAs} : {}),
        publisher: {'@type': 'Organization', name: SITE_NAME, url: absoluteUrl(baseUrl, '/')}
    };
};

// A plugin's on-site guide (/guides/[id]) as a TechArticle about that plugin.
export const guideJsonLd = (baseUrl: string, guide: {id: string; title: string}): JsonLd => ({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${guide.title} Guide`,
    url: absoluteUrl(baseUrl, `/guides/${encodeURIComponent(guide.id)}`),
    about: {
        '@type': 'SoftwareApplication',
        name: guide.title,
        url: absoluteUrl(baseUrl, resourcePath(guide.id))
    },
    publisher: {'@type': 'Organization', name: SITE_NAME, url: absoluteUrl(baseUrl, '/')}
});

// Serialise JSON-LD for an inline <script>. JSON.stringify leaves `<` alone,
// so a plugin description containing `</script>` would otherwise end the
// element early; escaping it (and the two line separators JavaScript treats as
// newlines) keeps the payload inert and still valid JSON.
export const serializeJsonLd = (data: JsonLd | readonly JsonLd[]): string =>
    JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
