import {describe, expect, it} from 'vitest';
import {
    breadcrumbJsonLd,
    guideJsonLd,
    pluginJsonLd,
    serializeJsonLd,
    websiteJsonLd,
    type PluginFacts
} from '../utils/structuredData';

const BASE_URL = 'https://dansplugins.com';

const PLUGIN: PluginFacts = {
    slug: 'medieval-factions',
    title: 'Medieval Factions',
    description: 'Factions, territory and diplomacy.',
    githubLink: 'https://github.com/Dans-Plugins/Medieval-Factions',
    spigotmcLink: 'https://www.spigotmc.org/resources/medieval-factions.79941/',
    icon: '/icons/mf.png',
    latestVersion: 'v5.7.0',
    firstReleasedAt: '2020-06-01T00:00:00Z',
    lastUpdatedAt: '2026-11-01T00:00:00Z',
    tags: ['factions', 'roleplay']
};

describe('websiteJsonLd', () => {
    it('names the site, its origin and its publisher', () => {
        const data = websiteJsonLd(BASE_URL);

        expect(data['@context']).toBe('https://schema.org');
        expect(data['@type']).toBe('WebSite');
        expect(data.name).toBe("Dan's Plugins Community");
        expect(data.url).toBe('https://dansplugins.com/');
        expect(data.publisher).toMatchObject({
            '@type': 'Organization',
            logo: 'https://dansplugins.com/icon-512.png',
            sameAs: ['https://github.com/Dans-Plugins']
        });
    });
});

describe('breadcrumbJsonLd', () => {
    it('numbers the crumbs from one with absolute URLs', () => {
        expect(breadcrumbJsonLd(`${BASE_URL}/`, [
            {name: 'Guides', path: '/guides'},
            {name: 'Fiefs Guide', path: '/guides/fiefs'}
        ])).toEqual({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {'@type': 'ListItem', position: 1, name: 'Guides', item: 'https://dansplugins.com/guides'},
                {'@type': 'ListItem', position: 2, name: 'Fiefs Guide', item: 'https://dansplugins.com/guides/fiefs'}
            ]
        });
    });
});

describe('pluginJsonLd', () => {
    it('describes a plugin as a free SoftwareApplication at its resource page', () => {
        const data = pluginJsonLd(BASE_URL, PLUGIN);

        expect(data).toMatchObject({
            '@type': 'SoftwareApplication',
            name: 'Medieval Factions',
            description: 'Factions, territory and diplomacy.',
            url: 'https://dansplugins.com/resources/medieval-factions',
            applicationCategory: 'GameApplication',
            offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
            softwareVersion: 'v5.7.0',
            datePublished: '2020-06-01T00:00:00Z',
            dateModified: '2026-11-01T00:00:00Z',
            image: 'https://dansplugins.com/icons/mf.png',
            keywords: 'factions, roleplay',
            sameAs: [PLUGIN.githubLink, PLUGIN.spigotmcLink]
        });
    });

    it('never copies in a third-party rating', () => {
        expect(pluginJsonLd(BASE_URL, PLUGIN)).not.toHaveProperty('aggregateRating');
    });

    it('leaves out what is unknown rather than emitting empty values', () => {
        const json = JSON.parse(serializeJsonLd(pluginJsonLd(BASE_URL, {
            ...PLUGIN,
            description: '  ',
            spigotmcLink: null,
            icon: null,
            latestVersion: null,
            firstReleasedAt: null,
            lastUpdatedAt: null,
            tags: []
        })));

        for (const key of ['description', 'image', 'softwareVersion', 'datePublished', 'dateModified', 'keywords']) {
            expect(json).not.toHaveProperty(key);
        }
        expect(json.sameAs).toEqual([PLUGIN.githubLink]);
    });

    it('passes an absolute icon URL through untouched', () => {
        const data = pluginJsonLd(BASE_URL, {...PLUGIN, icon: 'https://cdn.example.com/mf.png'});

        expect(data.image).toBe('https://cdn.example.com/mf.png');
    });
});

describe('guideJsonLd', () => {
    it('describes a guide as a TechArticle about its plugin', () => {
        expect(guideJsonLd(BASE_URL, {id: 'fiefs', title: 'Fiefs'})).toMatchObject({
            '@type': 'TechArticle',
            headline: 'Fiefs Guide',
            url: 'https://dansplugins.com/guides/fiefs',
            about: {'@type': 'SoftwareApplication', name: 'Fiefs', url: 'https://dansplugins.com/resources/fiefs'}
        });
    });
});

describe('serializeJsonLd', () => {
    it('escapes characters that could end the script element or break the line', () => {
        const text = serializeJsonLd({name: '</script>\u2028\u2029'});

        expect(text).not.toMatch(/[<\u2028\u2029]/);
        expect(JSON.parse(text)).toEqual({name: '</script>\u2028\u2029'});
    });
});
