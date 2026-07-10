import React, {useState} from 'react';
import {Box, Button, Snackbar, Tooltip, Typography} from '@mui/material';
import {claimItem, releaseItem} from '../services/claimService';
import {usernameFromToken} from '../utils/authToken';

interface ClaimButtonProps {
    repo: string;
    number: number;
    // Who currently holds the claim, or null if it's unclaimed.
    claimantUsername: string | null;
    token: string | null;
    // Called after a successful claim/release so the parent can update its map.
    onChange: (claimantUsername: string | null) => void;
}

const ClaimButton: React.FC<ClaimButtonProps> = ({repo, number, claimantUsername, token, onChange}) => {
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{message: string; signIn?: boolean} | null>(null);
    const currentUsername = usernameFromToken(token);
    const isMine = claimantUsername !== null && claimantUsername === currentUsername;

    const goSignIn = () => {
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `/account?returnTo=${encodeURIComponent(returnTo)}`;
    };

    const handleClaim = async () => {
        if (!token) {
            setNotice({message: 'Sign in to claim an issue or PR.', signIn: true});
            return;
        }
        if (busy) {
            return;
        }
        setBusy(true);
        const result = await claimItem(token, repo, number);
        if (result.ok) {
            onChange(result.claim?.claimantUsername ?? currentUsername);
        } else {
            setNotice({message: result.message});
        }
        setBusy(false);
    };

    const handleRelease = async () => {
        if (!token || busy) {
            return;
        }
        setBusy(true);
        const result = await releaseItem(token, repo, number);
        if (result.ok) {
            onChange(null);
        } else {
            setNotice({message: result.message});
        }
        setBusy(false);
    };

    if (claimantUsername && !isMine) {
        return (
            <Tooltip title="Someone's already working on this">
                <Typography variant="body2" color="text.secondary">
                    Claimed by {claimantUsername}
                </Typography>
            </Tooltip>
        );
    }

    return (
        <>
            <Box sx={{display: 'inline-flex', alignItems: 'center'}}>
                {isMine ? (
                    <Button size="small" variant="outlined" disabled={busy} onClick={handleRelease}>
                        Release
                    </Button>
                ) : (
                    <Button size="small" variant="text" disabled={busy} onClick={handleClaim}>
                        I&apos;m working on this
                    </Button>
                )}
            </Box>
            <Snackbar
                open={notice !== null}
                autoHideDuration={4000}
                onClose={() => setNotice(null)}
                message={notice?.message}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                action={notice?.signIn
                    ? <Button color="secondary" size="small" onClick={goSignIn}>Sign in</Button>
                    : undefined}
            />
        </>
    );
};

export default ClaimButton;
