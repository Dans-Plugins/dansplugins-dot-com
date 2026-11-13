/**
 * @vitest-environment jsdom
 */
// Renders /news with posts handed in as props (the server side is covered by
// news.getServerSideProps.test.ts) to pin that each post is shown in the order
// given with its title, body and a badge naming where it came from, that the
// date line prints the day in UTC and adds the author only when there is one,
// that a "View source" link opening in a new tab appears only for a post with a
// source URL, and that an empty list says there is no news yet.
import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';

vi.mock('next/router', () => ({useRouter: () => ({pathname: '/news', asPath: '/news', query: {}, push: vi.fn()})}));
// The page module imports getNewsPosts for its server side, which reads and
// seeds data/news.json on disk. Mock it so rendering never touches that file.
vi.mock('../utils/newsStorage', () => ({getNewsPosts: vi.fn()}));

import News from '../pages/news';
import type {NewsPost} from '../utils/newsStorage';

afterEach(cleanup);

const post = (overrides: Partial<NewsPost> & Pick<NewsPost, 'id'>): NewsPost => ({
    title: `Post ${overrides.id}`,
    date: '2026-06-06',
    body: `Body of ${overrides.id}.`,
    source: 'direct',
    sourceUrl: null,
    author: null,
    ...overrides,
});

// A post's card is the MUI Paper holding its title heading.
const card = (title: string) =>
    screen.getByRole('heading', {level: 6, name: title}).closest('.MuiPaper-root') as HTMLElement;

describe('/news page', () => {
    it('renders the posts in the order given, each with its title and body', () => {
        const posts = [post({id: 'b'}), post({id: 'a'}), post({id: 'c'})];
        render(<News posts={posts}/>);

        const titles = screen.getAllByRole('heading', {level: 6}).map((h) => h.textContent);
        expect(titles).toEqual(['Post b', 'Post a', 'Post c']);
        for (const p of posts) {
            expect(within(card(p.title)).getByText(p.body)).toBeTruthy();
        }
        expect(screen.queryByText('No news yet. Check back soon!')).toBeNull();
    });

    it('labels each post by its source', () => {
        render(<News posts={[
            post({id: 'direct', source: 'direct'}),
            post({id: 'discord', source: 'discord'}),
            post({id: 'external', source: 'external'}),
        ]}/>);

        const badge = (title: string) => within(card(title)).getByText(/./, {selector: '.MuiChip-label'}).textContent;
        expect(badge('Post direct')).toBe('Announcement');
        expect(badge('Post discord')).toBe('From Discord');
        expect(badge('Post external')).toBe('Reposted');
    });

    it('prints the date in UTC, and the author only when there is one', () => {
        render(<News posts={[
            post({id: 'anon', date: '2026-01-01'}),
            post({id: 'signed', date: '2026-10-31', author: 'Daniel'}),
        ]}/>);

        // A date-only string is midnight UTC; printed in local time west of UTC
        // it would fall on the day before.
        expect(within(card('Post anon')).getByText('January 1, 2026')).toBeTruthy();
        expect(within(card('Post signed')).getByText('October 31, 2026 · Daniel')).toBeTruthy();
        expect(within(card('Post anon')).queryByText(/·/)).toBeNull();
    });

    it('links to the source in a new tab only when the post has one', () => {
        render(<News posts={[
            post({id: 'linked', source: 'discord', sourceUrl: 'https://discord.com/channels/1/2/3'}),
            post({id: 'unlinked'}),
        ]}/>);

        const link = within(card('Post linked')).getByRole('link', {name: 'View source'});
        expect(link.getAttribute('href')).toBe('https://discord.com/channels/1/2/3');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');

        expect(within(card('Post unlinked')).queryByRole('link', {name: 'View source'})).toBeNull();
        expect(screen.getAllByRole('link', {name: 'View source'})).toHaveLength(1);
    });

    it('says there is no news yet when given no posts', () => {
        render(<News posts={[]}/>);

        expect(screen.getByRole('heading', {level: 1, name: 'News'})).toBeTruthy();
        expect(screen.getByText('No news yet. Check back soon!')).toBeTruthy();
        expect(screen.queryAllByRole('heading', {level: 6})).toHaveLength(0);
    });
});
