import fs from 'fs';
import path from 'path';

// Shared directory for server-persisted JSON (visits.json, news.json). Lives on
// the ./data volume bind-mounted in compose.yml, so it survives container
// restarts and can be edited in place.
export const DATA_DIR = path.join(process.cwd(), 'data');

// Write JSON atomically: ensure the parent directory exists, serialize, write to
// a temp file in the same directory, then rename it into place. rename is atomic
// on POSIX filesystems, so a crash or restart mid-write cannot leave a
// partially-written (invalid) file behind.
export const writeJsonAtomic = (
    filePath: string,
    value: unknown,
    options: { pretty?: boolean } = {}
): void => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const json = options.pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
    const tempFile = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, json);
    fs.renameSync(tempFile, filePath);
};
