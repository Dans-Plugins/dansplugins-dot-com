import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['__tests__/**/*.test.ts'],
        // The visit-storage and visits-API tests share an on-disk fixture
        // (data/visits.json), so run test files serially to avoid cross-file
        // races on that file.
        fileParallelism: false,
    },
});
