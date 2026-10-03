-- Hard dependencies between catalogue plugins (#349): a row says the plugin
-- cannot run without the required one. The resource page reads it both ways:
-- an add-on's page says what it requires, and the required plugin's page lists
-- its "Expansions" (every plugin requiring it). Hand-curated, like tags, and
-- deliberately not inferred from them: sharing the "factions" tag says what a
-- plugin is about, not that it needs Medieval Factions installed.
--
-- Additive only: a new table and new rows; no existing row is changed. The
-- required plugin is referenced by slug, the catalogue's public id (stored and
-- served as such, and never changed once created), so the admin form and the
-- API speak the same word. Removing either plugin's row removes the edge.

CREATE TABLE plugin_requires (
    plugin_id     UUID        NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
    required_slug VARCHAR(64) NOT NULL REFERENCES plugins (slug) ON DELETE CASCADE,
    PRIMARY KEY (plugin_id, required_slug)
);

CREATE INDEX idx_plugin_requires_required_slug ON plugin_requires (required_slug);

-- The four add-ons that will not load without Medieval Factions (each
-- declares it in plugin.yml `depend`). Soft integrations (Medieval Roleplay
-- Engine, Mailboxes, Medieval Economy) are not hard dependencies and are not
-- seeded. The JOIN skips any slug a box does not have, and ON CONFLICT keeps
-- the seed from failing where an admin has already entered the edge.
INSERT INTO plugin_requires (plugin_id, required_slug)
SELECT p.id, r.slug
FROM (VALUES
    ('currencies', 'medieval-factions'),
    ('fiefs', 'medieval-factions'),
    ('democracy', 'medieval-factions'),
    ('bluemap-medieval-factions', 'medieval-factions')
) AS t (slug, required)
JOIN plugins p ON p.slug = t.slug
JOIN plugins r ON r.slug = t.required
ON CONFLICT (plugin_id, required_slug) DO NOTHING;
