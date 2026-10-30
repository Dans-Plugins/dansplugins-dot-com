import type {ProgramUsage} from '../../utils/traceUsage';

// 30 UTC days ending 2026-10-03, oldest first, as trace serves them.
export const thirtyDays = (perDay: (i: number) => number = (i) => (i % 7) + 1) =>
    Array.from({length: 30}, (_, i) => {
        const day = new Date(Date.UTC(2026, 8, 4 + i)).toISOString().slice(0, 10);
        return {day, startups: perDay(i)};
    });

/**
 * A plugin as trace serves it since it added uses: `startupUses` beside every
 * `startups`, larger where a trace-client 0.7.0+ coalesced repeats, and a
 * per-day server count (`installs`) that trace does not serve yet but the
 * servers trend draws from if it ever does.
 */
export const usageWithDailyServers = (): ProgramUsage => ({
    ...usageWithInstalls(),
    startupUses30d: 430,
    days: thirtyDays().map((d, i) => ({...d, startupUses: d.startups + (i === 29 ? 18 : 0), installs: i < 15 ? 20 : 30})),
});

/** The live MedievalFactions answer's shape on 2026-10-29: uses served, no per-day servers. */
export const liveProgramBody = () => ({
    application: 'MedievalFactions',
    lastSeen: '2026-10-29T23:00:00Z',
    window: 'P30D',
    startups30d: 1626,
    startupUses30d: 1626,
    activeInstalls30d: 29,
    versions: [
        {version: '7.0.0', installs: null, startups: 1089, startupUses: 1089},
        {version: '8.0.0', installs: 26, startups: 187, startupUses: 187},
    ],
    days: [
        {day: '2026-10-27', startups: 50, startupUses: 50},
        {day: '2026-10-28', startups: 48, startupUses: 48},
        {day: '2026-10-29', startups: 40, startupUses: 40},
    ],
});

/** A plugin on a trace client that sends server IDs: servers are counted. */
export const usageWithInstalls = (): ProgramUsage => ({
    application: 'MedievalFactions',
    lastSeen: '2026-10-03T14:00:00Z',
    window: 'P30D',
    startups30d: 412,
    activeInstalls30d: 57,
    versions: [
        {version: '6.1.0', installs: 41, startups: 300},
        {version: '6.0.0', installs: 10, startups: 80},
        {version: null, installs: 6, startups: 32},
    ],
    days: thirtyDays(),
});

/** A plugin on an older client: only starts are known. */
export const usageWithoutInstalls = (): ProgramUsage => ({
    application: 'MedievalFactions',
    lastSeen: '2026-10-01T14:00:00Z',
    window: 'P30D',
    startups30d: 412,
    activeInstalls30d: null,
    versions: [
        {version: '6.1.0', installs: null, startups: 300},
        {version: '6.0.0', installs: null, startups: 80},
        {version: null, installs: null, startups: 32},
    ],
    days: thirtyDays(),
});

/**
 * trace's /api/public/summary as it reads once trace summarises servers: `installs` counts
 * distinct servers (newer clients only), `count` and `uninstalled` are raw
 * events. Fiefs' huge raw count stands in for one server's command flood.
 */
export const summaryWithInstalls = () => [
    {application: 'MedievalFactions', count: 2400, installs: 31, uninstalled: 900, lastSeen: '2026-10-03T14:00:00Z'},
    {application: 'Fiefs', count: 425000, installs: 3, uninstalled: 424000, lastSeen: '2026-10-03T00:00:00Z'},
    {application: 'Currencies', count: 900, installs: null, uninstalled: 900, lastSeen: '2026-10-02T00:00:00Z'},
];
