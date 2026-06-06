import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');

// Where a post came from, so the UI can label its provenance.
export type NewsSource = 'direct' | 'discord' | 'external';

const NEWS_SOURCES: NewsSource[] = ['direct', 'discord', 'external'];

export interface NewsPost {
    id: string;
    title: string;
    date: string;
    body: string;
    source: NewsSource;
    sourceUrl: string | null;
    author: string | null;
}

// Seed content written to data/news.json the first time the page is served.
// After that, the file is the source of truth and can be edited on the server
// (it lives on the mounted ./data volume) without rebuilding the site.
const DEFAULT_POSTS: NewsPost[] = [
    {
        id: 'community-data-api',
        title: 'Community Data API and Factions Leaderboard',
        date: '2026-06-06',
        body: 'A new backend API lets Medieval Factions servers publish faction data to a shared community registry, and the website now features a public factions leaderboard built from it.',
        source: 'direct',
        sourceUrl: null,
        author: null
    },
    {
        id: 'new-pages',
        title: 'New About, Road Map, and Commissions Pages',
        date: '2026-06-06',
        body: 'The site now has an About page introducing the community, a Road Map of planned and completed work, and a Commissions page for custom plugin development.',
        source: 'direct',
        sourceUrl: null,
        author: null
    }
];

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

// Normalize a raw post (from the file or the DPC API) into a fully-populated,
// serializable NewsPost (no `undefined` values, which Next.js cannot serialize
// into props).
export const normalizePost = (raw: unknown): NewsPost | null => {
    if (typeof raw !== 'object' || raw === null) {
        return null;
    }
    const post = raw as Record<string, unknown>;
    if (!isNonEmptyString(post.id) || !isNonEmptyString(post.title)
        || !isNonEmptyString(post.date) || !isNonEmptyString(post.body)) {
        return null;
    }
    const source = NEWS_SOURCES.includes(post.source as NewsSource) ? (post.source as NewsSource) : 'direct';
    return {
        id: post.id,
        title: post.title,
        date: post.date,
        body: post.body,
        source,
        sourceUrl: isNonEmptyString(post.sourceUrl) ? post.sourceUrl : null,
        author: isNonEmptyString(post.author) ? post.author : null
    };
};

const sortNewestFirst = (posts: NewsPost[]): NewsPost[] =>
    [...posts].sort((a, b) => b.date.localeCompare(a.date));

// Combine locally-authored posts with posts from the DPC API into a single
// feed, newest-first. Local posts win on an id collision so a hand-authored
// post is never overridden by an API post sharing its id.
export const mergeNewsPosts = (local: NewsPost[], remote: NewsPost[]): NewsPost[] => {
    const byId = new Map<string, NewsPost>();
    for (const post of remote) {
        byId.set(post.id, post);
    }
    for (const post of local) {
        byId.set(post.id, post);
    }
    return sortNewestFirst(Array.from(byId.values()));
};

// Write atomically: temp file + rename, so an interrupted write cannot leave a
// partial/invalid news.json behind.
const writeNewsData = (posts: NewsPost[]) => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${NEWS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ posts }, null, 2));
    fs.renameSync(tempFile, NEWS_FILE);
};

// Read the news posts, newest first. If the file is absent, seed it with the
// default posts. If it is present but unreadable/invalid, log and serve the
// defaults WITHOUT overwriting the file, so an editing typo never destroys
// existing content.
export const getNewsPosts = (): NewsPost[] => {
    try {
        if (!fs.existsSync(NEWS_FILE)) {
            writeNewsData(DEFAULT_POSTS);
            return sortNewestFirst(DEFAULT_POSTS);
        }
        const parsed: unknown = JSON.parse(fs.readFileSync(NEWS_FILE, 'utf8'));
        if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { posts?: unknown }).posts)) {
            const posts = (parsed as { posts: unknown[] }).posts
                .map(normalizePost)
                .filter((post): post is NewsPost => post !== null);
            return sortNewestFirst(posts);
        }
        console.error('news.json has an unexpected shape; serving default posts.');
    } catch (error) {
        console.error('Failed to read news.json; serving default posts.', error);
    }
    return sortNewestFirst(DEFAULT_POSTS);
};
