import type {Components, Theme} from '@mui/material';

// On a touch screen a control needs room for a fingertip: 44 by 44 CSS
// pixels, the size Apple's Human Interface Guidelines and WCAG 2.5.5 (Target
// Size) give. MUI's small buttons and icon buttons are 30–34px, sized for a
// mouse pointer, so a phone visitor aiming at the Like heart or a footer link
// can miss it or hit its neighbour.
//
// The rule applies only under `(pointer: coarse)`, so desktop layouts keep
// their compact controls. It sets a minimum size rather than more padding, so
// the icon or label inside stays the same size and only the target area
// grows.
export const COARSE_POINTER = '@media (pointer: coarse)';

const TOUCH_MIN = 44;

export const touchTargetOverrides: Components<Theme> = {
    MuiButton: {
        styleOverrides: {
            root: {[COARSE_POINTER]: {minHeight: TOUCH_MIN}},
        },
    },
    MuiIconButton: {
        styleOverrides: {
            root: {[COARSE_POINTER]: {minWidth: TOUCH_MIN, minHeight: TOUCH_MIN}},
        },
    },
    MuiToggleButton: {
        styleOverrides: {
            root: {[COARSE_POINTER]: {minHeight: TOUCH_MIN, minWidth: TOUCH_MIN}},
        },
    },
    // A clickable chip (a tag filter, the SpigotMC rating link) keeps its
    // look; an invisible layer stretches its hit area to 44px tall, so it
    // stays a chip in a row of chips rather than turning into a button.
    MuiChip: {
        styleOverrides: {
            clickable: {
                [COARSE_POINTER]: {
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        height: TOUCH_MIN,
                        transform: 'translateY(-50%)',
                    },
                },
            },
        },
    },
    MuiTableSortLabel: {
        styleOverrides: {
            root: {[COARSE_POINTER]: {minHeight: TOUCH_MIN}},
        },
    },
};
