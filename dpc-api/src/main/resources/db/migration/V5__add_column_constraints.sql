-- Factions table column constraints
ALTER TABLE factions ALTER COLUMN name TYPE VARCHAR(64);
ALTER TABLE factions ALTER COLUMN server_id TYPE VARCHAR(64);
ALTER TABLE factions ALTER COLUMN description TYPE VARCHAR(512);
ALTER TABLE factions ALTER COLUMN server_ip TYPE VARCHAR(253);
ALTER TABLE factions ALTER COLUMN discord_link TYPE VARCHAR(512);

-- Accounts table column constraint
ALTER TABLE accounts ALTER COLUMN username TYPE VARCHAR(32);

-- API keys table column constraint
ALTER TABLE api_keys ALTER COLUMN server_name TYPE VARCHAR(64);
