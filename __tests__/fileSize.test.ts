import {describe, expect, it} from 'vitest';
import {formatFileSize} from '../utils/fileSize';

describe('formatFileSize', () => {
    it('formats whole bytes without a decimal', () => {
        expect(formatFileSize(512)).toBe('512 B');
    });

    it('steps up a unit at 1024', () => {
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('keeps one decimal place above bytes', () => {
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(2411724)).toBe('2.3 MB');
    });

    it('stops at gigabytes rather than inventing a unit', () => {
        expect(formatFileSize(5 * 1024 ** 3)).toBe('5 GB');
        expect(formatFileSize(2048 * 1024 ** 3)).toBe('2048 GB');
    });

    it('formats an absent or nonsensical size as zero rather than throwing', () => {
        // A plugin jar can't be zero bytes; a jar whose size the API got wrong
        // should still render a usable download button.
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(-1)).toBe('0 B');
        expect(formatFileSize(Number.NaN)).toBe('0 B');
        expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe('0 B');
    });
});
