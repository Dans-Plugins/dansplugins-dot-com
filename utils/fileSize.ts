// Human-readable file sizes for download links. Binary units (KiB-sized steps
// labelled KB/MB), which is what GitHub's own release UI shows for the same
// asset — a download button that disagrees with the page it links to reads as a
// mistake even when both numbers are defensible.

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * Formats a byte count for display, e.g. 2411724 to "2.3 MB".
 *
 * Negative or non-finite inputs (a field the API could only produce by being
 * wrong) format as "0 B" rather than throwing: a download button with an odd
 * size on it is a better failure than a page that does not render.
 */
export const formatFileSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < UNITS.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    // Whole bytes never need a decimal; larger units get one significant place.
    const rounded = unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${UNITS[unitIndex]}`;
};
