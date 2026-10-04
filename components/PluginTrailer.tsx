import React from 'react';
import {Box, IconButton, type SxProps, type Theme} from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {trailerAspectRatio, type PluginTrailer as Trailer} from '../utils/pluginTrailers';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface PluginTrailerProps {
    trailer: Trailer;
    sx?: SxProps<Theme>;
    // How the clip waits to load:
    //  'near'    (the plugin page) the server renders the poster, and the clip
    //            replaces it once the box comes near the viewport;
    //  'visible' (a details panel on the home page) nothing at all — not even
    //            the poster — loads until the box is actually on screen, and
    //            the video is unmounted again when it is hidden. The grid
    //            keeps every closed panel mounted (hidden) for its Like
    //            state, so this is what keeps a closed panel from costing a
    //            byte, and stops a clip's download when its panel closes.
    load?: 'near' | 'visible';
}

// A plugin's short preview clip: muted, looping, inline (never fullscreen on
// an iPhone), with no sound. Mirrors danielstephenson.dev's GameTrailer: the
// <video> is put in only in the browser, only when the visitor has not asked
// for reduced motion (a change of that setting is followed live), and a pause
// button sits in the corner, because a loop that never ends must be stoppable
// (WCAG 2.2.2).
const PluginTrailer: React.FC<PluginTrailerProps> = ({trailer, sx, load = 'near'}) => {
    const box = React.useRef<HTMLDivElement>(null);
    const video = React.useRef<HTMLVideoElement>(null);
    const [reduced, setReduced] = React.useState(true); // the poster until the browser says otherwise
    const [inView, setInView] = React.useState(false);
    const [paused, setPaused] = React.useState(false);

    React.useEffect(() => {
        let query: MediaQueryList | null = null;
        try {
            query = window.matchMedia?.(REDUCED_MOTION_QUERY) ?? null;
        } catch {
            query = null;
        }
        setReduced(Boolean(query?.matches));
        if (!query) return undefined;
        const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
        query.addEventListener?.('change', onChange);
        return () => query?.removeEventListener?.('change', onChange);
    }, []);

    React.useEffect(() => {
        const element = box.current;
        if (!element) return undefined;
        if (typeof IntersectionObserver === 'undefined') {
            // No way to tell an open panel from a closed one: a panel shows no
            // clip rather than every closed panel loading one. A page still does.
            setInView(load === 'near');
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            const seen = entries.some((entry) => entry.isIntersecting);
            if (load === 'near') {
                if (seen) {
                    setInView(true);
                    observer.disconnect();
                }
            } else {
                setInView(seen);
            }
        }, {rootMargin: load === 'near' ? '200px' : '0px'});
        observer.observe(element);
        return () => observer.disconnect();
    }, [load]);

    const showPoster = load === 'near' || inView;
    const playing = !reduced && inView && Boolean(trailer.webm || trailer.mp4);

    // React sets `muted` as a property, which some browsers read too late to
    // allow autoplay; set it again and start the clip by hand.
    React.useEffect(() => {
        const element = video.current;
        if (!playing || !element) return;
        element.muted = true;
        if (paused) element.pause();
        else element.play?.()?.catch?.(() => setPaused(true));
    }, [playing, paused]);

    return (
        <Box
            ref={box}
            data-testid="plugin-trailer"
            sx={[
                {
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 2,
                    bgcolor: '#000',
                    aspectRatio: trailerAspectRatio(trailer),
                    '& img, & video': {display: 'block', width: '100%', height: '100%', objectFit: 'cover'},
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <Box role="img" aria-label={trailer.alt} sx={{width: '100%', height: '100%'}}>
                {playing ? (
                    <video
                        ref={video}
                        aria-hidden
                        poster={trailer.poster}
                        autoPlay={!paused}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        disablePictureInPicture
                        data-testid="plugin-trailer-video"
                    >
                        {trailer.webm ? <source src={trailer.webm} type="video/webm"/> : null}
                        {trailer.mp4 ? <source src={trailer.mp4} type="video/mp4"/> : null}
                    </video>
                ) : showPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trailer.poster} alt="" aria-hidden loading="lazy" data-testid="plugin-trailer-poster"/>
                ) : null}
            </Box>
            {playing ? (
                <IconButton
                    size="small"
                    onClick={() => setPaused((was) => !was)}
                    aria-label={paused ? 'Play the preview clip' : 'Pause the preview clip'}
                    aria-pressed={paused}
                    sx={{
                        position: 'absolute',
                        right: 6,
                        bottom: 6,
                        width: 40,
                        height: 40,
                        color: '#fff',
                        bgcolor: 'rgba(0, 0, 0, 0.55)',
                        '&:hover': {bgcolor: 'rgba(0, 0, 0, 0.75)'},
                    }}
                >
                    {paused ? <PlayArrowIcon fontSize="small"/> : <PauseIcon fontSize="small"/>}
                </IconButton>
            ) : null}
        </Box>
    );
};

export default PluginTrailer;
