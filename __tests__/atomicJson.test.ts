import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DATA_DIR, writeJsonAtomic } from '../utils/atomicJson';

const TEST_DIR = path.join(DATA_DIR, '__atomicjson_test__');

const cleanup = () => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
};

describe('writeJsonAtomic', () => {
    afterEach(cleanup);

    it('writes compact JSON by default', () => {
        const file = path.join(TEST_DIR, 'compact.json');
        writeJsonAtomic(file, { a: 1, b: 2 });
        expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1,"b":2}');
    });

    it('writes pretty-printed JSON when the pretty option is set', () => {
        const file = path.join(TEST_DIR, 'pretty.json');
        writeJsonAtomic(file, { a: 1 }, { pretty: true });
        expect(fs.readFileSync(file, 'utf8')).toBe('{\n  "a": 1\n}');
    });

    it('creates the parent directory if it does not exist', () => {
        const file = path.join(TEST_DIR, 'nested', 'deep', 'file.json');
        writeJsonAtomic(file, { ok: true });
        expect(fs.existsSync(file)).toBe(true);
    });

    it('overwrites an existing file and leaves no temp file behind', () => {
        const file = path.join(TEST_DIR, 'overwrite.json');
        writeJsonAtomic(file, { v: 1 });
        writeJsonAtomic(file, { v: 2 });
        expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ v: 2 });
        const leftovers = fs.readdirSync(TEST_DIR).filter((name) => name.includes('.tmp'));
        expect(leftovers).toEqual([]);
    });
});
