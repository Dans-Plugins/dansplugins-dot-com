import type {AppProps} from 'next/app'
import React, {useEffect, useMemo, useState} from 'react';
import {Box, createTheme, CssBaseline, ThemeProvider} from '@mui/material';
import {ColorModeContext} from '../utils/ColorModeContext';
import {COLOR_MODE_STORAGE_KEY, ColorMode, resolveInitialColorMode} from '../utils/colorMode';

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
                    primary: {main: isDark ? '#5c7cfa' : '#4263eb'},
                    // Gold accent — used sparingly for emphasis (a nod to the
                    // Minecraft/medieval audience without leaning faux-medieval).
                    secondary: {main: '#f59f00'},
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
            });
        },
        [mode]
    );

    return (
        <>
            <ColorModeContext.Provider value={colorMode}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
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
