import {getApiBaseUrl} from '../utils/apiBase';
import {toCataloguePlugin, type CataloguePlugin} from './pluginCatalogueService';

/**
 * The admin's side of the catalogue: what `/admin/plugins` sends to
 * `POST`/`PUT /api/v1/plugins`. Runs in the browser with the signed-in
 * user's UserAuth token; the API decides whether that user is an admin
 * (`DPC_ADMIN_USERNAMES`), and the page only asks `/profile/me` first so it
 * can say "admins only" instead of showing a form that would be refused.
 */

/** A catalogue entry as the form edits it — the API's own field names. */
export interface PluginUpsert {
    slug: string;
    title: string;
    description: string;
    githubUrl: string;
    spigotmcUrl: string;
    bstatsId: string;
    iconPath: string;
    tags: string[];
}

export type AdminResult<T> = {ok: true; value: T} | {ok: false; message: string; fieldErrors?: Record<string, string>};

const API_BASE = () => getApiBaseUrl();

/** The form's shape for an existing entry, "" standing for an absent optional. */
export const upsertFrom = (plugin: CataloguePlugin): PluginUpsert => ({
    slug: plugin.id,
    title: plugin.title,
    description: plugin.description,
    githubUrl: plugin.githubLink,
    spigotmcUrl: plugin.spigotmcLink ?? '',
    bstatsId: plugin.bStatsId ?? '',
    iconPath: plugin.icon ?? '',
    tags: plugin.tags,
});

export const EMPTY_UPSERT: PluginUpsert = {
    slug: '', title: '', description: '', githubUrl: '', spigotmcUrl: '', bstatsId: '', iconPath: '', tags: [],
};

/** "medieval, factions,, Economy " → ["medieval", "factions", "economy"]. */
export const parseTags = (text: string): string[] =>
    Array.from(new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t !== '')));

/** Whether the signed-in user may edit the catalogue, per `/profile/me`. */
export const fetchIsAdmin = async (token: string): Promise<boolean | null> => {
    try {
        const res = await fetch(`${API_BASE()}/api/v1/profile/me`, {headers: {Authorization: `Bearer ${token}`}});
        if (!res.ok) {
            return null;
        }
        const body = await res.json();
        return body?.admin === true;
    } catch {
        return null;
    }
};

const failure = async (res: Response): Promise<AdminResult<never>> => {
    const fallback = res.status === 401 ? 'Your session has expired. Please sign in again.'
        : res.status === 403 ? 'Only an admin can edit the catalogue.'
        : res.status === 409 ? 'A plugin with that slug already exists.'
        : res.status === 404 ? 'That plugin is no longer in the catalogue.'
        : `The API refused the change (HTTP ${res.status}).`;
    try {
        const body = await res.json();
        const fieldErrors = body?.errors && typeof body.errors === 'object' ? body.errors as Record<string, string> : undefined;
        const message = typeof body?.detail === 'string' && body.detail !== 'Validation failed'
            ? body.detail
            : fieldErrors ? 'Some fields need attention.' : fallback;
        return {ok: false, message, fieldErrors};
    } catch {
        return {ok: false, message: fallback};
    }
};

const send = async (token: string, method: 'POST' | 'PUT', path: string, body: PluginUpsert): Promise<AdminResult<CataloguePlugin>> => {
    try {
        const res = await fetch(`${API_BASE()}${path}`, {
            method,
            headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            return failure(res);
        }
        const saved = toCataloguePlugin(await res.json());
        return saved ? {ok: true, value: saved} : {ok: false, message: 'The API answered with something unexpected.'};
    } catch {
        return {ok: false, message: 'Could not reach the API.'};
    }
};

export const createPlugin = (token: string, body: PluginUpsert): Promise<AdminResult<CataloguePlugin>> =>
    send(token, 'POST', '/api/v1/plugins', body);

export const updatePlugin = (token: string, slug: string, body: PluginUpsert): Promise<AdminResult<CataloguePlugin>> =>
    send(token, 'PUT', `/api/v1/plugins/${encodeURIComponent(slug)}`, body);
