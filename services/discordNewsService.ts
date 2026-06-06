import { NewsPost, normalizePost } from '../utils/newsStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:45345';

// Fetch community news posts from the DPC API (currently Discord announcements)
// and normalize them into the site's NewsPost shape. This is server-side only
// (called from getServerSideProps). Like the visit counter, it is non-essential
// and must never break the News page: any failure (API down, non-2xx, bad
// payload) resolves to an empty list so the page still renders local posts.
export const getApiNewsPosts = async (): Promise<NewsPost[]> => {
    try {
        const response = await fetch(`${API_BASE}/api/v1/news`);
        if (!response.ok) {
            return [];
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
            return [];
        }
        return data
            .map(normalizePost)
            .filter((post): post is NewsPost => post !== null);
    } catch (error) {
        console.error('Failed to fetch news from the DPC API; showing local posts only.', error);
        return [];
    }
};
