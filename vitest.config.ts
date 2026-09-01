import { defineConfig } from 'vitest/config';

export default defineConfig({
    esbuild: {
        // Components use the automatic JSX runtime, so a .tsx test does not have
        // to import React purely to render one.
        jsx: 'automatic',
    },
    test: {
        // Default for the suite, which is mostly pure functions and API handlers.
        // Files that render components opt into jsdom with a
        // `// @vitest-environment jsdom` docblock.
        environment: 'node',
        include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
        // The visit-storage and visits-API tests share an on-disk fixture
        // (data/visits.json), so run test files serially to avoid cross-file
        // races on that file.
        fileParallelism: false,
    },
});
