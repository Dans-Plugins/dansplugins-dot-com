import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const VISITS_FILE = path.join(DATA_DIR, 'visits.json');

interface VisitData {
    visits: number;
    startDate: string;
}

const createDefaultData = (): VisitData => ({
    visits: 0,
    startDate: new Date().toISOString()
});

const isValidVisitData = (value: unknown): value is VisitData => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const data = value as Record<string, unknown>;
    return typeof data.visits === 'number' && typeof data.startDate === 'string';
};

// Write atomically: write to a temp file in the same directory, then rename it
// into place. rename is atomic on POSIX filesystems, so a crash or restart
// mid-write cannot leave a partially-written (invalid) visits.json behind.
const writeVisitData = (data: VisitData) => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${VISITS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data));
    fs.renameSync(tempFile, VISITS_FILE);
};

export const initializeVisitStorage = () => {
    if (!fs.existsSync(VISITS_FILE)) {
        writeVisitData(createDefaultData());
    }
};

// Tolerant read: if the file is missing, unreadable, or contains invalid JSON
// or an unexpected shape, log the problem and re-initialize from defaults
// rather than throwing. This stops a single corrupt/truncated file from
// wedging the visits API (and, in turn, the home page) until it is manually
// deleted.
export const getVisitData = (): VisitData => {
    try {
        const parsed: unknown = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
        if (isValidVisitData(parsed)) {
            return parsed;
        }
        console.error('visits.json has an unexpected shape; re-initializing from defaults.');
    } catch (error) {
        console.error('Failed to read visits.json; re-initializing from defaults.', error);
    }
    const defaults = createDefaultData();
    writeVisitData(defaults);
    return defaults;
};

export const incrementVisitCount = (): VisitData => {
    const data = getVisitData();
    data.visits += 1;
    writeVisitData(data);
    return data;
};
