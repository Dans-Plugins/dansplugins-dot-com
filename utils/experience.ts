// localStorage key marking that the visitor has already dismissed (or acted on)
// the first-visit "I run a server" / "I build plugins" splash, so it doesn't
// reappear on later visits. Kept pure (no window access) so the check is
// unit-testable.
export const EXPERIENCE_CHOSEN_KEY = 'dpc-experience-chosen';

export const hasChosenExperience = (stored: string | null): boolean => stored === 'true';
