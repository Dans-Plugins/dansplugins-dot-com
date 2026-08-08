// The on-site resource pages (`/resources/[slug]`) — one per plugin in the
// catalogue, gathering everything known about it in one addressable place. Kept
// pure and separate from the route in pages/, the same split as utils/guides.ts
// and utils/sitemap.ts, so the URL shape can be unit-tested and there is exactly
// one definition of it for links, the sitemap and canonical URLs to share.
//
// The slug is the plugin id already used by pages/data/plugins.json and by
// `likes.target_id`, so a resource URL, a guide URL and a like target all name a
// plugin the same way. See RESOURCE_HUB.md.

// Percent-encoded as a single path segment: every slug today is a plain
// lowercase id, but Next.js hands `params.slug` back decoded, so encoding here
// is what keeps a generated link and the route it resolves to in agreement
// whatever a slug contains.
export const resourcePath = (slug: string): string => `/resources/${encodeURIComponent(slug)}`;

// The meta description for a resource page. Falls back to the plugin's own
// description, which is what a search result should show, but keeps the
// community framing when the description is missing.
export const resourceDescription = (pluginTitle: string, description: string): string =>
    description.trim() || `${pluginTitle}, a Minecraft plugin from Dan's Plugins Community.`;
