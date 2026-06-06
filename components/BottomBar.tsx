import {AppBar, Box, Button, Toolbar, Typography, useTheme} from '@mui/material';
import React, {useContext} from 'react';
import {ColorModeToggleSwitch} from './ColorModeToggleSwitch';
import {ColorModeContext} from '../utils/ColorModeContext';
import CodeIcon from '@mui/icons-material/Code';
import BugReportIcon from '@mui/icons-material/BugReport';

// Import styles
import {
    toolbarStyle,
    bottomAppBarStyle,
    footerButtonStyle,
    versionNumberStyle,
    toggleSwitchBoxStyle,
    flexContainerStyle
} from '../styles/styles';


const FooterButton: React.FC<{ href: string; icon: React.ReactNode; children: React.ReactNode }> = ({
                                                                                                        href,
                                                                                                        icon,
                                                                                                        children,
                                                                                                    }) => (
    <Button color="inherit" href={href} startIcon={icon} sx={(theme) => footerButtonStyle(theme)}>
        {children}
    </Button>
);

const VersionNumber: React.FC<{ version: string }> = ({version}) => (
    <Typography variant="body1" color="inherit" component="div" sx={(theme) => versionNumberStyle(theme)}>
        v{version}
    </Typography>
);

interface BottomBarProps {
    version: string;
    visits?: number | null;
    startDate?: string | null;
}

const BottomBar: React.FC<BottomBarProps> = ({version, visits, startDate}) => {
    const colorMode = useContext(ColorModeContext);
    const theme = useTheme();

    const formattedDate = startDate ? new Date(startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : null;

    return (
        <AppBar position="static" sx={(theme) => bottomAppBarStyle(theme)}>
            <Toolbar sx={(theme) => toolbarStyle(theme)}>
                <Box sx={(theme) => flexContainerStyle(theme)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <VersionNumber version={version}/>
                        {visits != null && startDate && (
                            <>
                                <Typography variant="body2" color="inherit">
                                    •
                                </Typography>
                                <Typography variant="body2" color="inherit">
                                    {visits} visits since {formattedDate}
                                </Typography>
                            </>
                        )}
                    </Box>

                    <Box sx={(theme) => flexContainerStyle(theme, {gap: 1})}>
                        <FooterButton
                            href="https://github.com/Dans-Plugins/dpc-website"
                            icon={<CodeIcon/>}
                        >
                            Source Code
                        </FooterButton>
                        <FooterButton
                            href="https://github.com/Dans-Plugins/dpc-website/issues/new/choose"
                            icon={<BugReportIcon/>}
                        >
                            Report a Bug
                        </FooterButton>
                    </Box>
                </Box>

                <Box sx={toggleSwitchBoxStyle}>
                    <ColorModeToggleSwitch
                        checked={theme.palette.mode === 'dark'}
                        onChange={colorMode.toggleColorMode}
                        inputProps={{'aria-label': 'Toggle dark mode'}}
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default BottomBar;