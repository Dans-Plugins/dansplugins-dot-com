// True when a navigation link points at the page currently being viewed.
// External links (http/https) are never treated as "active" — only in-site
// routes participate in the "you are here" indication. Kept pure so it can be
// unit-tested and reused by the navigation bar.
export const isActiveNavLink = (pathname: string, href: string): boolean =>
    !href.startsWith('http') && pathname === href;
