import React from 'react';
import NextLink, {LinkProps as NextLinkProps} from 'next/link';

// Bridges next/link's client-side routing into MUI's `component` prop pattern
// (component={NextLinkComposed} to="/path"), so any MUI component that renders
// an anchor (Button, Link, ListItemButton, Box component="a", ...) can navigate
// without a full page reload. `to` (rather than `href`) avoids colliding with
// the `href` most of those MUI components already accept in their own props.
interface NextLinkComposedProps
    extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
        Omit<NextLinkProps, 'href' | 'as' | 'passHref'> {
    to: NextLinkProps['href'];
    linkAs?: NextLinkProps['as'];
}

export const NextLinkComposed = React.forwardRef<HTMLAnchorElement, NextLinkComposedProps>(
    function NextLinkComposed(props, ref) {
        const {to, linkAs, replace, scroll, shallow, prefetch, locale, ...other} = props;

        return (
            <NextLink
                href={to}
                as={linkAs}
                replace={replace}
                scroll={scroll}
                shallow={shallow}
                prefetch={prefetch}
                locale={locale}
                passHref
            >
                <a ref={ref} {...other} />
            </NextLink>
        );
    },
);
