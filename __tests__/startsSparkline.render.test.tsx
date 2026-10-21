// @vitest-environment jsdom
//
// Renders the 30-day starts sparkline directly, to pin what its accessible
// name and labels say at the edges UsagePanel's fixtures never reach: no
// days, no starts, a tie for the peak, one day, and a day trace sent that is
// not a date.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import StartsSparkline from '../components/StartsSparkline';
import type {DailyStarts} from '../utils/traceUsage';

afterEach(cleanup);

const days = (...startups: number[]): DailyStarts[] =>
    startups.map((n, i) => ({day: `2026-10-0${i + 1}`, startups: n}));

const linePath = (container: HTMLElement): string | null =>
    container.querySelectorAll('path')[1].getAttribute('d');

describe('StartsSparkline', () => {
    it('renders nothing when trace sent no days', () => {
        const {container} = render(<StartsSparkline days={[]}/>);

        expect(container.firstChild).toBeNull();
    });

    it('names the range, the total and the first of two equal peaks', () => {
        render(<StartsSparkline days={days(3, 7, 7, 2)}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 4: 19 in total, peaking at 7 on Oct 2.');
        expect(screen.getByTestId('starts-sparkline').textContent).toBe('Oct 1Peak 7 on Oct 2Oct 4');
    });

    it('claims no peak and draws a flat line along the bottom when no server started', () => {
        const {container} = render(<StartsSparkline days={days(0, 0)}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 2: 0 in total.');
        expect(screen.getByTestId('starts-sparkline').textContent).toBe('Oct 1Oct 2');
        expect(linePath(container)).toBe('M0.0,46.0 L300.0,46.0');
    });

    it('draws a single day as one point at the top', () => {
        const {container} = render(<StartsSparkline days={days(5)}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 1: 5 in total, peaking at 5 on Oct 1.');
        expect(linePath(container)).toBe('M0.0,2.0');
    });

    it('groups thousands in the accessible name and the peak label', () => {
        render(<StartsSparkline days={days(1234, 1000)}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 2: 2,234 in total, peaking at 1,234 on Oct 1.');
        expect(screen.getByTestId('starts-sparkline').textContent).toContain('Peak 1,234 on Oct 1');
    });

    it('shows a day that is not a date as trace sent it', () => {
        render(<StartsSparkline days={[{day: 'not-a-date', startups: 4}]}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from not-a-date to not-a-date: 4 in total, peaking at 4 on not-a-date.');
    });

    it('keeps the accessible name but drops the visible labels when showLabels is false', () => {
        render(<StartsSparkline days={days(3, 7)} showLabels={false}/>);

        expect(screen.getByRole('img').getAttribute('aria-label'))
            .toBe('Server starts per day from Oct 1 to Oct 2: 10 in total, peaking at 7 on Oct 2.');
        expect(screen.getByTestId('starts-sparkline').textContent).toBe('');
    });

    it('sizes the drawing to the height it is given', () => {
        const {container} = render(<StartsSparkline days={days(0, 4)} height={20}/>);

        const svg = screen.getByRole('img');
        expect(svg.getAttribute('height')).toBe('20');
        expect(svg.getAttribute('viewBox')).toBe('0 0 300 20');
        expect(linePath(container)).toBe('M0.0,18.0 L300.0,2.0');
    });
});
