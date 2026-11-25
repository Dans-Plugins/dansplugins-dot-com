import {styled, Switch} from '@mui/material';

export const ColorModeToggleSwitch = styled(Switch)(({theme}) => ({
    width: 62,
    height: 34,
    padding: 7,
    '& .MuiSwitch-switchBase': {
        margin: 1,
        padding: 0,
        transform: 'translateX(6px)',
        '&.Mui-checked': {
            color: '#fff',
            transform: 'translateX(22px)',
            '& .MuiSwitch-thumb:before': {
                backgroundImage: `url('/colormode/dark.svg')`,
            },
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
            },
        },
    },
    '& .MuiSwitch-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#000000' : '#ffffff',
        width: 32,
        height: 32,
        '&:before': {
            content: "''",
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url('/colormode/light.svg')`,
        },
    },
    '& .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
        borderRadius: 20 / 2,
    },
    // Touch screens: a 44px-tall tap area (WCAG 2.5.5) with the same look.
    // The root clips its children, so it grows by 10px with 5px more padding
    // on each side (the track stays 20px), the thumb moves down 5px to stay
    // centred, and the invisible input stretches over the full 44px.
    '@media (pointer: coarse)': {
        height: 44,
        paddingTop: 12,
        paddingBottom: 12,
        '& .MuiSwitch-switchBase': {top: 5},
        '& .MuiSwitch-input': {top: -6, height: 44},
    },
}));