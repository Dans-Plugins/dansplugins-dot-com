import type {GetServerSideProps} from 'next';
import {siteBaseUrl} from '../utils/seo';
import {robotsTxt} from '../utils/sitemap';

// Serves /robots.txt. A route rather than a static file under public/ because the
// `Sitemap:` line has to be an absolute URL and the origin is
// environment-specific (NEXT_PUBLIC_BASE_URL, documented in CONFIG.md), which a
// checked-in file would have to hard-code.

export const getServerSideProps: GetServerSideProps = async ({res}) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(robotsTxt(siteBaseUrl()));
    res.end();
    return {props: {}};
};

// Next.js requires a default export from every file in pages/. The response is
// written in getServerSideProps above, so this component never renders.
const RobotsTxt = () => null;

export default RobotsTxt;
