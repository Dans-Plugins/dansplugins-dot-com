import type {AppProps} from 'next/app'
import React, {useEffect, useMemo, useState} from 'react';
import {createTheme, CssBaseline, ThemeProvider} from '@mui/material';
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
        () => createTheme({
            palette: {
                mode
            },
            typography: {
                button: {
                    textTransform: 'none'
                }
            }
        }),
        [mode]
    );

    return (
        <>
            <ColorModeContext.Provider value={colorMode}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    <Component {...pageProps} />
                </ThemeProvider>
            </ColorModeContext.Provider>
        </>
    )
}

export default MyApp
