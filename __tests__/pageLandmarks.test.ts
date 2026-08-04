import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

// Drift guards for the two document-structure promises every page makes, both of
// which are invisible until someone navigating by keyboard or screen reader hits
// them. The check is on the page source rather than a render because these are
// static props on a JSX element, and the alternative — mounting twelve pages
// whose getServerSideProps and effects all reach for the network — would test
// far more than the markup in question. Same shape as the pages/ walk in
// __tests__/sitemap.test.ts.

// Page files that must declare the landmark and heading themselves. Skipped:
// Next.js special files (_app, _document); API handlers; every non-.tsx route,
// which covers the two crawler documents (pages/robots.txt.ts and
// pages/sitemap.xml.ts serve text, not a document); and the error pages, which
// delegate their whole chrome to components/ErrorPage.tsx and are asserted
// separately below.
const pageSources = (dir = 'pages', prefix = 'pages'): {path: string; source: string}[] =>
    readdirSync(join(process.cwd(), dir), {withFileTypes: true}).flatMap((entry) => {
        if (entry.isDirectory()) {
            return entry.name === 'api' ? [] : pageSources(join(dir, entry.name), `${prefix}/${entry.name}`);
        }
        const match = entry.name.match(/^(.*)\.tsx$/);
        if (!match) {
            return [];
        }
        const name = match[1];
        if (name.startsWith('_') || name === '404' || name === '500') {
            return [];
        }
        return [{
            path: `${prefix}/${entry.name}`,
            source: readFileSync(join(process.cwd(), dir, entry.name), 'utf8')
        }];
    });

// The one page that does not spell its <h1> out inline: the home page's heading
// is the site wordmark, which lives in the component below. Listed explicitly so
// the exception has to be renewed deliberately rather than assumed.
const HEADING_FROM_COMPONENT: Record<string, string> = {
    'pages/index.tsx': 'components/Blurb.tsx'
};

const readComponent = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8');

describe('page landmarks', () => {
    // pages/_app.tsx renders a "Skip to main content" link pointing at #main as
    // the first focusable element on every page. A page without that target
    // leaves the link inert — announced, focusable, and going nowhere.
    it('every page marks its content container as <main id="main">', () => {
        const missing = pageSources()
            .filter(({source}) => !(source.includes('component="main"') && source.includes('id="main"')))
            .map(({path}) => path);

        expect(missing).toEqual([]);
    });

    it('the error pages inherit the landmark from their shared layout', () => {
        const errorPage = readComponent('components/ErrorPage.tsx');

        expect(errorPage).toContain('component="main"');
        expect(errorPage).toContain('id="main"');
    });
});

describe('page headings', () => {
    // MUI's Typography maps variant="h3" to an <h3> element unless `component`
    // says otherwise, so a page title styled as h3 without the override leaves
    // the page with no <h1> at all.
    it('every page renders a top-level <h1>', () => {
        const missing = pageSources()
            .filter(({path, source}) => {
                const owner = HEADING_FROM_COMPONENT[path];
                return !(owner ? readComponent(owner) : source).includes('component="h1"');
            })
            .map(({path}) => path);

        expect(missing).toEqual([]);
    });
});

describe('the guards themselves', () => {
    // Guards the guards: a broken directory walk would make both checks above
    // pass vacuously.
    it('finds the site\'s pages, including the dynamic routes', () => {
        const paths = pageSources().map(({path}) => path);

        expect(paths).toContain('pages/index.tsx');
        expect(paths).toContain('pages/dev/index.tsx');
        expect(paths).toContain('pages/guides/[id].tsx');
        expect(paths).toContain('pages/u/[username].tsx');
    });

    it('skips the files that have no page chrome of their own', () => {
        const paths = pageSources().map(({path}) => path);

        expect(paths).not.toContain('pages/_app.tsx');
        expect(paths).not.toContain('pages/_document.tsx');
        expect(paths).not.toContain('pages/404.tsx');
        expect(paths).not.toContain('pages/500.tsx');
    });

    it('names a component that really does own the home page heading', () => {
        Object.entries(HEADING_FROM_COMPONENT).forEach(([page, owner]) => {
            expect(pageSources().map(({path}) => path)).toContain(page);
            expect(readComponent(owner)).toContain('component="h1"');
        });
    });
});
