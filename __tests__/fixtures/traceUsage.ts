import type {ProgramUsage} from '../../utils/traceUsage';

// 30 UTC days ending 2026-10-03, oldest first, as trace serves them.
export const thirtyDays = (perDay: (i: number) => number = (i) => (i % 7) + 1) =>
    Array.from({length: 30}, (_, i) => {
        const day = new Date(Date.UTC(2026, 8, 4 + i)).toISOString().slice(0, 10);
        return {day, startups: perDay(i)};
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
