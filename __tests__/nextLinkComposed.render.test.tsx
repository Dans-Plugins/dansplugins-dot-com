// @vitest-environment jsdom
//
// The rest of the suite runs in the `node` environment (see vitest.config.ts);
// this file is the exception, because it renders a component and inspects the
// DOM it produces.
import React from 'react';
import {Box, Button, ListItemButton} from '@mui/material';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';

import {NextLinkComposed} from '../components/NextLinkComposed';

afterEach(cleanup);

describe('NextLinkComposed', () => {
    // The regression guard for this component. Under Next 12 the Link wanted a
    // child `<a>`, so the component wrapped one in `passHref`. On Next 13+ the
    // Link renders its own anchor, and keeping that wrapper would nest two
    // anchors — invalid HTML that breaks styling and assistive technology.
    it('renders exactly one anchor, at the route given as `to`', () => {
        const {container} = render(<NextLinkComposed to="/guides">Guides</NextLinkComposed>);

        expect(container.querySelectorAll('a')).toHaveLength(1);
        expect(screen.getByRole('link', {name: 'Guides'}).getAttribute('href')).toBe('/guides');
    });

    // Every call site drives this through MUI's `component` prop rather than
    // rendering it directly, so cover that shape too.
    it.each([
        ['Button', Button],
        ['ListItemButton', ListItemButton],
        ['Box', Box],
    ])('renders one anchor when used as a MUI %s `component`', (_name, Component) => {
        const {container} = render(
            <Component component={NextLinkComposed} to="/news">
                News
            </Component>,
        );

        expect(container.querySelectorAll('a')).toHaveLength(1);
        const link = screen.getByRole('link', {name: 'News'});
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBe('/news');
    });

    // MUI needs the ref to reach the real anchor, and passes styling through as
    // className; both went through the inner `<a>` before and now go to the Link.
    it('forwards its ref to the anchor and passes anchor attributes through', () => {
        const ref = React.createRef<HTMLAnchorElement>();
        render(
            <NextLinkComposed to="/news" ref={ref} className="custom" aria-label="Latest news">
                News
            </NextLinkComposed>,
        );

        expect(ref.current?.tagName).toBe('A');
        expect(ref.current?.className).toContain('custom');
        expect(screen.getByRole('link', {name: 'Latest news'})).toBeTruthy();
    });
});
