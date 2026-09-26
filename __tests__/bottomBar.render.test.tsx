// @vitest-environment jsdom
//
// Renders the site footer to pin its off-site links: the knowledge base, Dan's
// Server Hosting, and the backlink to the author's portfolio.
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

import BottomBar from '../components/BottomBar';

afterEach(cleanup);

describe('BottomBar links', () => {
    it('links the knowledge base and free server hosting in a new tab', () => {
        render(<BottomBar version="1.0.0"/>);

        const kb = screen.getByRole('link', {name: /Knowledge Base/});
        expect(kb.getAttribute('href')).toBe('https://zettel.dansplugins.com');
        expect(kb.getAttribute('target')).toBe('_blank');

        const dsh = screen.getByRole('link', {name: /Free Server Hosting/});
        expect(dsh.getAttribute('href')).toBe('https://dansserverhosting.com');
        expect(dsh.getAttribute('target')).toBe('_blank');
    });

    it('carries the same-tab backlink to danielstephenson.dev', () => {
        render(<BottomBar version="1.0.0"/>);

        const link = screen.getByRole('link', {name: 'danielstephenson.dev'});
        expect(link.getAttribute('href')).toBe('https://danielstephenson.dev');
        expect(link.getAttribute('target')).toBeNull();
        expect(link.parentElement?.textContent).toBe('More by Daniel Stephenson → danielstephenson.dev');
    });
});
