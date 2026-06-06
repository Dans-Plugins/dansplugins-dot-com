import fs from 'fs';
import path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVisitData, incrementVisitCount, initializeVisitStorage } from '../utils/visitStorage';

const VISITS_FILE = path.join(process.cwd(), 'data', 'visits.json');

const removeVisitsFile = () => {
    if (fs.existsSync(VISITS_FILE)) {
        fs.rmSync(VISITS_FILE);
    }
};

const writeRaw = (contents: string) => {
    fs.mkdirSync(path.dirname(VISITS_FILE), { recursive: true });
    fs.writeFileSync(VISITS_FILE, contents);
};

describe('visitStorage', () => {
    beforeEach(() => {
        removeVisitsFile();
        // getVisitData logs when it recovers from a bad file; keep output quiet.
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(removeVisitsFile);

    it('initializes the store with zero visits', () => {
        initializeVisitStorage();
        const data = getVisitData();
        expect(data.visits).toBe(0);
        expect(typeof data.startDate).toBe('string');
    });

    it('re-initializes from defaults when the file contains invalid JSON', () => {
        writeRaw('not valid json {{{');
        const data = getVisitData();
        expect(data.visits).toBe(0);
        // The bad file should have been repaired to valid JSON.
        expect(() => JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'))).not.toThrow();
    });

    it('re-initializes from defaults when the JSON shape is unexpected', () => {
        writeRaw(JSON.stringify({ unexpected: 'shape' }));
        const data = getVisitData();
        expect(data.visits).toBe(0);
        expect(typeof data.startDate).toBe('string');
    });

    it('recovers when the file is missing entirely', () => {
        removeVisitsFile();
        expect(getVisitData().visits).toBe(0);
    });

    it('increments and persists the visit count', () => {
        initializeVisitStorage();
        expect(incrementVisitCount().visits).toBe(1);
        expect(incrementVisitCount().visits).toBe(2);
        expect(getVisitData().visits).toBe(2);
    });
});
