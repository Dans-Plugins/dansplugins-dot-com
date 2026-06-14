// Read the username (the JWT `sub` claim) from a UserAuth token for *display*
// only — this does NOT verify the signature and must never gate access. Returns
// null when the token is absent or malformed.
export const usernameFromToken = (token: string | null | undefined): string | null => {
    if (!token) {
        return null
    }
    try {
        const payload = token.split('.')[1]
        if (!payload) {
            return null
        }
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        const data = JSON.parse(json) as Record<string, unknown>
        return typeof data.sub === 'string' ? data.sub : null
    } catch {
        return null
    }
}
