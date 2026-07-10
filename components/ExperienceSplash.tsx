import React from 'react';
import {Box, Button, Dialog, DialogContent, Stack, Typography} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CodeIcon from '@mui/icons-material/Code';

interface ExperienceChoiceProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}

const ExperienceChoice: React.FC<ExperienceChoiceProps> = ({icon, title, description, onClick}) => (
    <Button
        onClick={onClick}
        variant="outlined"
        sx={{
            flex: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            textTransform: 'none',
            height: '100%',
        }}
    >
        <Box sx={{fontSize: 40, display: 'flex'}}>{icon}</Box>
        <Typography variant="h6" component="span">{title}</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
            {description}
        </Typography>
    </Button>
);

interface ExperienceSplashProps {
    open: boolean;
    onChoosePlayer: () => void;
    onChooseDeveloper: () => void;
}

/**
 * First-visit choice between the plugin catalogue and the developer portal.
 * Dismissing without choosing (backdrop click / Escape) is treated the same
 * as "I run a server" — the common case — rather than trapping the visitor.
 */
const ExperienceSplash: React.FC<ExperienceSplashProps> = ({open, onChoosePlayer, onChooseDeveloper}) => (
    <Dialog open={open} onClose={onChoosePlayer} maxWidth="sm" fullWidth>
        <DialogContent sx={{p: 4}}>
            <Typography variant="h5" component="h2" gutterBottom textAlign="center" sx={{mb: 1}}>
                Welcome to Dan&apos;s Plugins Community
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{mb: 3}}>
                What brings you here?
            </Typography>
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                <ExperienceChoice
                    icon={<SportsEsportsIcon fontSize="inherit"/>}
                    title="I run a server"
                    description="Browse and install plugins for your Minecraft server."
                    onClick={onChoosePlayer}
                />
                <ExperienceChoice
                    icon={<CodeIcon fontSize="inherit"/>}
                    title="I build plugins"
                    description="See what's open across every repo and pitch in."
                    onClick={onChooseDeveloper}
                />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{mt: 2}}>
                You can switch anytime from the Dev Portal link in the top navigation.
            </Typography>
        </DialogContent>
    </Dialog>
);

export default ExperienceSplash;
