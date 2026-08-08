import {Theme} from '@mui/material/styles';

/**
 * Standard animation transition for interactive elements
 */
const commonTransition = {
    transition: 'all 0.3s ease',
};

/**
 * Creates a subtle hover background effect that adapts to light/dark theme
 * Light mode: 5% black overlay
 * Dark mode: 10% white overlay
 */
const commonHoverBg = (theme: Theme) => ({
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
});

/**
 * Section headers: heading text in the standard text colour with a short
 * primary-coloured accent bar underneath (replaces the former full-width blue
 * underline).
 */
export const sectionHeaderStyle = (theme: Theme) => ({
    fontWeight: 700,
    letterSpacing: '-0.01em',
    display: 'inline-block',
    marginBottom: theme.spacing(3),
    '&::after': {
        content: '""',
        display: 'block',
        width: '44px',
        height: '3px',
        marginTop: theme.spacing(1),
        borderRadius: '2px',
        backgroundColor: theme.palette.primary.main,
    },
});

/**
 * Responsive grid container spacing configuration
 */
export const gridContainerStyle = {spacing: {xs: 2, md: 3}, pb: 4};

/**
 * Card wrapper with hover lift animation
 */
export const cardWrapperStyle = {
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    },
};

/**
 * Clean hairline section divider (replaces the former gradient-fade line).
 */
export const sectionDividerStyle = (theme: Theme) => ({
    height: '1px',
    border: 0,
    backgroundColor: theme.palette.divider,
    marginY: theme.spacing(6),
});

/**
 * Main page layout. Uses a clean themed background (the former 20px grid
 * overlay was removed as part of the UI refresh).
 */
export const pageStyle = (theme: Theme) => ({
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
});

/**
 * Plugins container layout configuration
 */
export const pluginsBoxStyle = {flexGrow: 1, marginBottom: 2};

/**
 * Responsive grid item configuration for different breakpoints
 */
export const gridItemStyle = {
    // Cap at 4 columns (lg) so cards stay readable on wide screens instead of
    // squeezing to 6 across.
    xs: 12, sm: 6, md: 4, lg: 3,
    sx: cardWrapperStyle,
};

/**
 * Standard vertical padding for containers
 */
export const containerPaddingStyle = (theme: Theme) => ({
    paddingY: theme.spacing(4),
});

/**
 * App bar surface. Solid colour instead of the former indigo gradient (kept in
 * sync with the MuiAppBar theme override in _app.tsx).
 */
export const appBarStyle = (theme: Theme) => ({
    backgroundImage: 'none',
    backgroundColor: theme.palette.mode === 'dark' ? '#161b22' : theme.palette.primary.main,
});

/**
 * Navigation button with hover lift and background effect
 */
export const navButtonStyle = (theme: Theme) => ({
    color: 'inherit',
    marginX: theme.spacing(0.5),
    ...commonTransition,
    '&:hover': {
        transform: 'translateY(-2px)',
        ...commonHoverBg(theme),
    },
});

/**
 * Brand name with gradient text effect and hover scale
 */
export const brandNameStyle = (theme: Theme) => ({
    display: 'inline',
    marginRight: theme.spacing(2),
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: 'inherit',
});

/**
 * Flexible toolbar layout with customizable alignment
 */
export const toolbarStyle = (theme: Theme, options?: { justifyContent?: string; flexWrap?: string }) => ({
    paddingY: theme.spacing(0.5),
    display: 'flex',
    justifyContent: options?.justifyContent || 'space-between',
    flexWrap: options?.flexWrap || 'wrap',
});

/**
 * Toggle switch container with hover scale effect
 */
export const toggleSwitchBoxStyle = {
    flexGrow: 0,
    ...commonTransition,
    '&:hover': {transform: 'scale(1.1)'},
};

/**
 * Bottom app bar with border and positioning
 */
export const bottomAppBarStyle = (theme: Theme) => ({
    ...appBarStyle(theme),
    top: 'auto',
    bottom: 0,
    borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
});

/**
 * Footer button extending nav button styles
 */
export const footerButtonStyle = (theme: Theme) => ({
    ...navButtonStyle(theme),
    marginX: theme.spacing(1),
});

/**
 * Version number display with monospace font and hover effects
 */
export const versionNumberStyle = (theme: Theme) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${theme.spacing(0.5)} ${theme.spacing(2)}`,
    borderRadius: theme.shape.borderRadius,
    ...commonHoverBg(theme),
    fontFamily: 'monospace',
    fontWeight: theme.typography.fontWeightMedium,
    ...commonTransition,
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        transform: 'scale(1.05)',
    },
});

/**
 * Flexible container with customizable alignment and spacing
 */
export const flexContainerStyle = (theme: Theme, options?: {
    gap?: number;
    alignItems?: string;
    flexWrap?: string;
}) => ({
    display: 'flex',
    alignItems: options?.alignItems || 'center',
    gap: theme.spacing(options?.gap || 2),
    flexWrap: options?.flexWrap || 'wrap',
});

/**
 * Blurb section container layout
 */
export const blurbBoxStyle = (theme: Theme) => ({
    flexGrow: 1,
    paddingY: theme.spacing(4),
});

/**
 * Gradient title style for blurb sections
 */
export const blurbTitleStyle = (theme: Theme) => ({
    fontWeight: 700,
    letterSpacing: '-0.02em',
    marginBottom: theme.spacing(4),
    textAlign: 'center',
});

/**
 * Spacing for blurb grid container
 */
export const blurbGridContainerStyle = (theme: Theme) => ({
    marginTop: theme.spacing(2),
});

/**
 * Info card with centered content and hover lift effect
 */
export const infoCardStyle = (theme: Theme) => ({
    padding: theme.spacing(3),
    height: '100%',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    },
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
});

/**
 * Icon styling for info cards
 */
export const infoCardIconStyle = (theme: Theme) => ({
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
});

/**
 * Bold title style for info cards
 */
export const infoCardTitleStyle = () => ({
    fontWeight: 'bold',
});

/**
 * Standard icon size for info cards
 */
export const infoCardIconSizeStyle = {
    fontSize: 40,
};

/**
 * Mobile navigation drawer surface, matching the app bar's colour.
 */
export const navDrawerPaperStyle = (theme: Theme) => ({
    width: 260,
    backgroundColor: theme.palette.mode === 'dark' ? '#161b22' : theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
});

/**
 * Section label inside the mobile navigation drawer (e.g. "Community").
 */
export const navDrawerSectionLabelStyle = (theme: Theme) => ({
    paddingX: theme.spacing(2),
    paddingTop: theme.spacing(2),
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.75rem',
});

/**
 * Divider between the primary links and the Community section in the mobile
 * navigation drawer. Always a light line since the drawer surface is the
 * app bar colour (dark enough in both palette modes) rather than the
 * default paper background.
 */
export const navDrawerDividerStyle = {
    borderColor: 'rgba(255,255,255,0.12)',
};

/**
 * Plugin card layout with fixed height
 */
export const pluginCardStyle = {
    height: '18rem',
    display: 'flex',
    flexDirection: 'column',
};

/**
 * Content area for plugin cards
 */
export const pluginCardContentStyle = {
    flexGrow: 1,
};

/**
 * Action buttons container for plugin cards
 */
export const pluginCardActionsStyle = {
    flexGrow: 0,
    // The actions row grew a link to the plugin's resource page; wrap rather
    // than overflow it on a narrow card.
    flexWrap: 'wrap',
    rowGap: 1,
};