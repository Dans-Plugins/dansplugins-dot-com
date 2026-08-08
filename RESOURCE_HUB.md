# Resource Hub — design

How dansplugins.com grows from a one-page plugin catalogue into a
SpigotMC-style resource hub for Dan's Plugins, without rebuilding the parts of
SpigotMC that are a liability rather than a feature.

This is a design document, not a status report. The
[Road Map](pages/data/roadmap.json) tracks which phases are done; the
[issue tracker](https://github.com/Dans-Plugins/dansplugins-dot-com/issues)
tracks the day-to-day work.

## Why

SpigotMC is where most people find these plugins today, and it should stay
that way — it is the discovery funnel. What it cannot do is be a *home*:
its resource pages are shallow, its ratings double as an unmoderated support
channel, and nothing on it knows that the person writing a review actually
runs the plugin.

DPC is in a position to know that. Servers already authenticate to `dpc-api`
with API keys and publish data through it, which is a relationship SpigotMC has
no equivalent of — and it is what makes
[verified reviews](#verified-reviews-need-a-signal-that-does-not-exist-yet)
reachable here. Reaching them takes work on the plugin side first; the section
below is honest about how much.

## What already exists

The site is closer to this than it looks; the pieces are just not arranged
as resource pages.

| SpigotMC concept | Where it already lives in DPC |
| --- | --- |
| Resource listing | `pages/data/plugins.json` rendered as a `PluginCard` grid on `/`, with search and sort (`utils/sortPlugins.ts`) |
| Download / version | Latest GitHub release tag on each card (`utils/github.ts`) |
| Install count | bStats server counts (`utils/bstats.ts`) |
| Likes | `likes(target_type, target_id)` — already polymorphic over `plugin`, `guide`, `issue`, `feature_request` |
| Accounts | UserAuth (external) plus a local `users` mirror holding display name, avatar and bio |
| Member profile | `/u/[username]`, with badges and likes |
| Badges | `BadgeService`, derived from state rather than stored |
| Documentation | `/guides/[id]`, rendered from each plugin repo's `USER_GUIDE.md` |
| Issue tracker / ideas | Backlog sync, claims, and feature requests (`/dev`) |

The polymorphic like table matters most: the "community content is keyed by a
plugin id" decision is already made, and reviews and comments key the same way.

## Decisions

### Mirror GitHub releases; never host files

Downloads point at GitHub release assets. `dpc-api` syncs release metadata
(tag, body as changelog, published date, per-asset `download_count`) on a
schedule, the same way `BacklogSyncService` already syncs issues, and the site
renders from that mirror.

The alternative — accepting uploads — buys nothing and costs storage, malware
scanning, takedown handling and the legal exposure that comes with hosting
binaries. Every plugin already publishes releases on GitHub, so the mirror is
strictly less work and strictly more accurate.

### Reviews, discussion and bug reports are three different things

SpigotMC's worst design flaw is that its rating system doubles as a support
queue: authors collect one-star reviews that are really unfiled bug reports,
and can reply but never resolve. Splitting them is the main thing this hub
does better.

* **Reviews** — one per user, one to five stars plus text, editable by the
  author of the review, with a single inline author response. Aggregate rating
  is denormalised onto the plugin row.
* **Discussion** — threaded comments, unlimited per user, no rating attached.
* **Bugs** — not on this site. The button opens the plugin repository's GitHub
  issue template, where the backlog already lives.

### Verified reviews need a signal that does not exist yet

The goal: a review is marked **verified** when the reviewer runs a server that
actually has the plugin installed. "Sort by verified reviews" would then produce
a trust signal no other Minecraft plugin site can produce.

The data to derive that is **not** in `dpc-api` today, and it is worth being
precise about the gap rather than discovering it mid-implementation:

* The only inbound server data is faction sync, from Medieval Factions. It
  carries a faction name, a free-text `serverId`, a member count, and contact
  details — no plugin identity at all. Fifteen of the sixteen plugins report
  nothing.
* `ApiKeyAuthFilter` only checks that *some* valid key was presented. It does
  not resolve the key's owner, so even the faction rows that do arrive are not
  attributable to a user.
* `api_keys.server_name` is a label its owner typed; `factions.server_id` is an
  id the plugin sends. Nothing joins them.
* bStats gives aggregate server counts and nothing per-server, so it cannot
  identify an individual reviewer either.

So the one thing derivable today is the existing `SERVER_OWNER` badge — "owns an
API key, therefore runs *a* server that syncs with DPC" — which is not the same
claim and should not be dressed up as one.

Closing the gap needs three things, in order:

1. `ApiKeyAuthFilter` resolves the presented key to its owner and puts it in the
   security context, so anything a server reports is attributable.
2. An install report: plugins call `dpc-api` with their API key to say "this
   server is running this plugin, at this version". This is work in the plugin
   repositories, not only here, and it is the long pole.
3. The verified mark itself, derived at read time from those reports the way
   `BadgeService` derives badges — no new stored state, nothing to drift.

Until step 2 has shipped in enough plugins to be meaningful, reviews ship
**without** the verified mark. Building reviews around a badge that only ever
appears on Medieval Factions would be worse than not having it.

### The catalogue moves into the database, in two steps

`pages/data/plugins.json` is a build-time file, so nothing on the site can add
a tag, a rating aggregate or a version row to a plugin. The catalogue has to
become a table.

Doing that in one step would mean changing the schema, the API, the rendering
path and the editing UI at once. Instead:

1. `V15__create_plugins_table.sql` creates `plugins` and seeds it from the
   current catalogue. `dpc-api` serves it read-only. The site keeps rendering
   from `plugins.json`, so the switchover carries no risk of a blank home page.
   `__tests__/pluginCatalogue.test.ts` fails if the table and the file disagree
   on which plugins exist, what they are called, or which repository they point
   at — the three fields that break links and lookups if they drift.
   Descriptions and icons are not compared; they are cosmetic, and the whole
   comparison is deleted in step 2.
2. The "Editable Plugin Catalogue" phase flips rendering to the API, adds the
   admin editing UI, and deletes `plugins.json` along with its drift guard.

Slugs are the plugin ids already in use (`medieval-factions`), so existing
`/guides/[id]` URLs and every `likes.target_id` row stay valid.

### Moderation is about comments, not uploads

There is one resource author, so uploads are trusted and the untrusted content
is entirely user-written text. That needs, at minimum:

* a report action on every review and comment,
* soft delete plus a moderation queue behind the existing `AdminProperties`,
* per-user rate limits on posting,
* raw HTML disabled in `markdown-to-jsx` wherever user text is rendered —
  it is enabled by default, and the guide renderer's current settings are safe
  only because the markdown comes from trusted repositories.

### Notifications stay on-site

SpigotMC emails watchers on every update. Running mail is an ops burden and a
deliverability problem. Watched resources appear on `/account`, and an optional
Discord webhook posts updates into the community server people already use.

## Phases

Each phase is a shippable slice; none of them leaves the site in a worse state
than it started.

1. **Resource pages** — `V15` catalogue table and read API, `/resources/[slug]`
   overview pages, cards link to them, sitemap covers them.
2. **Version history** — release mirror, per-version changelogs, download
   counts, download button.
3. **Reviews** — ratings, aggregates, author responses, sort-by-rating in the
   catalogue. Not verified marks: those wait on the install signal above.
4. **Discussion** — threaded comments, reporting, moderation queue.
5. **Updates** — per-resource author posts, syndicated into `/news`; watching
   and notification.
6. **Discovery** — tags and categories, Minecraft-version filters, faceted
   search across the catalogue.

## Risks

**Empty states read as abandonment.** Sixteen plugins showing "0 reviews" looks
worse than no review tab at all. Rating summaries stay hidden until a plugin has
at least three reviews, and an empty tab says "No reviews yet" rather than
rendering a zeroed-out star widget.

**Moderation load arrives before the traffic does.** Comments are the phase most
likely to cost ongoing attention for the least return, which is why they come
after reviews rather than before, and why reporting and the moderation queue
ship in the same phase as the comments themselves.

**Splitting the audience.** Delisting from SpigotMC would trade a working
discovery channel for a site nobody can find. SpigotMC pages stay, pointing
here; dansplugins.com is the canonical home because it is deeper, not because
it is the only option.
