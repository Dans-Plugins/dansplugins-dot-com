-- V24 seeded Democracy's description with "Requires Medieval Factions 5 or 6."
-- Democracy 0.3.0 is verified against Medieval Factions 7.0.0 (its dependents gate run,
-- 2026-10-02), so the sentence is already stale, and any version list would go stale again.
-- The page shows the dependency itself since V25 ("Requires Medieval Factions"), so the
-- description drops the version clause.
--
-- Guarded on the exact seeded text: if the description was edited at /admin/plugins in the
-- meantime, this changes nothing.
UPDATE plugins
SET description = 'Lets a Medieval Factions faction hold elections: members stand as candidates, vote, and follow the count.'
WHERE slug = 'democracy'
  AND description = 'Lets a Medieval Factions faction hold elections: members stand as candidates, vote, and follow the count. Requires Medieval Factions 5 or 6.';
