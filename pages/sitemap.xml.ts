import type {GetServerSideProps} from 'next';
import {siteBaseUrl} from '../utils/seo';
import {STATIC_SITEMAP_PATHS, guideSitemapPaths, sitemapXml} from '../utils/sitemap';

// Serves /sitemap.xml. A route rather than a static file under public/ because
// the URLs must be absolute and the origin is environment-specific
// (NEXT_PUBLIC_BASE_URL, documented in CONFIG.md), which a checked-in file would
// have to hard-code.

interface GuidePlugin {
    id: string;
}

const pluginData = require('./data/plugins.json') as { plugins: GuidePlugin[] };

export const getServerSideProps: GetServerSideProps = async ({res}) => {
    const paths = [
        ...STATIC_SITEMAP_PATHS,
        ...guideSitemapPaths(pluginData.plugins.map((plugin) => plugin.id))
    ];
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.write(sitemapXml(siteBaseUrl(), paths));
    res.end();
    return {props: {}};
};

// Next.js requires a default export from every file in pages/. The response is
// written in getServerSideProps above, so this component never renders.
const SitemapXml = () => null;

export default SitemapXml;
