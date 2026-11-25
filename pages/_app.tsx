import type {AppProps} from 'next/app'
import React, {useEffect, useMemo, useState} from 'react';
import {Box, createTheme, CssBaseline, GlobalStyles, ThemeProvider} from '@mui/material';
import {ColorModeContext} from '../utils/ColorModeContext';
import {COLOR_MODE_STORAGE_KEY, ColorMode, resolveInitialColorMode} from '../utils/colorMode';
import {touchTargetOverrides} from '../styles/touchTargets';

function MyApp({Component, pageProps}: AppProps) {
    // Start from a stable default for server-side rendering, then resolve the
    // real mode on the client in an effect. Doing the localStorage/matchMedia
    // lookup during render would diverge between server and client and cause a
    // hydration mismatch.
    const [mode, setMode] = useState<ColorMode>('dark');

    useEffect(() => {
        const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
        const prefersDark = window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : true;
        setMode(resolveInitialColorMode(stored, prefersDark));
    }, []);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const nextMode: ColorMode = prevMode === 'light' ? 'dark' : 'light';
                    // Persist the explicit choice so it survives navigation and reloads.
                    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
                    return nextMode;
                });
            }
        }),
        [],
    );

    const theme = useMemo(
        () => {
            const isDark = mode === 'dark';
            const headingFont = '"Space Grotesk", system-ui, sans-serif';
            return createTheme({
                palette: {
                    mode,
                    // Pick button/chip text colour against WCAG AA (4.5:1) rather
                    // than MUI's default 3:1. With 3:1, white sat on the dark-mode
                    // blue (3.7:1) and on the gold accent (2.1:1).
                    contrastThreshold: 4.5,
                    primary: {main: isDark ? '#5c7cfa' : '#4263eb'},
                    // Gold accent — used sparingly for emphasis (a nod to the
                    // Minecraft/medieval audience without leaning faux-medieval).
                    secondary: {main: '#f59f00'},
                    // MUI's light-mode warning/info (#ed6c02, #0288d1) read at
                    // 3.1:1 and 3.9:1 as text on white (outlined chips, the
                    // road map's status counts); these keep the hue at AA.
                    ...(isDark ? {} : {warning: {main: '#b45309'}, info: {main: '#0277bd'}}),
                    background: isDark
                        ? {default: '#0e1117', paper: '#161b22'}
                        : {default: '#f6f8fa', paper: '#ffffff'},
                },
                shape: {borderRadius: 10},
                typography: {
                    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                    h1: {fontFamily: headingFont, fontWeight: 700, letterSpacing: '-0.02em'},
                    h2: {fontFamily: headingFont, fontWeight: 700, letterSpacing: '-0.02em'},
                    h3: {fontFamily: headingFont, fontWeight: 600, letterSpacing: '-0.01em'},
                    h4: {fontFamily: headingFont, fontWeight: 600},
                    h5: {fontFamily: headingFont, fontWeight: 600},
                    h6: {fontFamily: headingFont, fontWeight: 600},
                    button: {textTransform: 'none', fontWeight: 600},
                },
                components: {
                    // Solid app bars instead of the old indigo gradient.
                    MuiAppBar: {
                        defaultProps: {elevation: 0},
                        styleOverrides: {
                            root: ({theme}) => ({
                                backgroundImage: 'none',
                                backgroundColor: isDark ? '#161b22' : theme.palette.primary.main,
                                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.16)'}`,
                            }),
                        },
                    },
                    // Flat surfaces with a hairline border rather than heavy MUI elevation.
                    MuiPaper: {
                        styleOverrides: {
                            root: ({theme}) => ({
                                backgroundImage: 'none',
                                border: `1px solid ${theme.palette.divider}`,
                            }),
                        },
                    },
                    MuiButton: {
                        defaultProps: {disableElevation: true},
                        styleOverrides: {root: {borderRadius: 8}},
                    },
                },
            // Deep-merged over the options above: touch-sized controls on
            // coarse pointers (see styles/touchTargets.ts).
            }, {components: touchTargetOverrides});
        },
        [mode]
    );

    return (
        <>
            <ColorModeContext.Provider value={colorMode}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    <GlobalStyles styles={(t) => ({
                        // A visible keyboard focus ring everywhere. MUI buttons
                        // only pulse a ripple on focus, and with elevation
                        // disabled a focused contained button was hard to spot.
                        // currentColor keeps the ring visible on the blue app
                        // bar as well as on the page.
                        '.Mui-focusVisible, a:focus-visible, [tabindex]:focus-visible, button:focus-visible': {
                            outline: '2px solid currentColor',
                            outlineOffset: 2,
                        },
                        '.MuiButton-contained.Mui-focusVisible': {
                            outlineColor: t.palette.primary.main,
                        },
                        // Honour the OS "reduce motion" setting for every hover
                        // lift, transition and animation on the site (WCAG 2.3.3).
                        '@media (prefers-reduced-motion: reduce)': {
                            '*, *::before, *::after': {
                                animationDuration: '0.01ms !important',
                                animationIterationCount: '1 !important',
                                transitionDuration: '0.01ms !important',
                                // csstype has no room for !important on this one.
                                scrollBehavior: 'auto !important' as 'auto',
                            },
                        },
                    })}/>
                    {/* Skip link: the first focusable element, hidden until focused, lets
                        keyboard/screen-reader users jump past the nav to the page's
                        <main id="main"> content (WCAG 2.4.1). */}
                    <Box
                        component="a"
                        href="#main"
                        sx={{
                            position: 'fixed',
                            top: 8,
                            left: 8,
                            zIndex: (t) => t.zIndex.tooltip + 1,
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            boxShadow: 3,
                            bgcolor: 'background.paper',
                            color: 'primary.main',
                            transform: 'translateY(-150%)',
                            transition: 'transform 0.2s ease',
                            '&:focus': {transform: 'translateY(0)'},
                        }}
                    >
                        Skip to main content
                    </Box>
                    <Component {...pageProps} />
                </ThemeProvider>
            </ColorModeContext.Provider>
        </>
    )
}

export default MyApp
