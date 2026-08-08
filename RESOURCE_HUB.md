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

DPC already knows that. Servers authenticate to `dpc-api` with API keys and
publish data through it, and bStats reports install counts. That makes one
feature possible here that SpigotMC cannot offer at all — see
[Verified reviews](#verified-reviews) — and it is the reason to build this
rather than to keep pointing at SpigotMC.

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

### Verified reviews

A review is marked **verified** when the reviewer's account owns an API key
belonging to a server that reports the plugin in question. This is derived at
read time from state `dpc-api` already holds, exactly as `SERVER_OWNER` is
derived in `BadgeService` — nothing new is stored and nothing can drift.

The point is not the badge. It is that "sort by verified reviews" produces a
signal no other Minecraft plugin site can produce.

### The catalogue moves into the database, in two steps

`pages/data/plugins.json` is a build-time file, so nothing on the site can add
a tag, a rating aggregate or a version row to a plugin. The catalogue has to
become a table.

Doing that in one step would mean changing the schema, the API, the rendering
path and the editing UI at once. Instead:

1. `V15__create_plugins_table.sql` creates `plugins` and seeds it from the
   current catalogue. `dpc-api` serves it read-only. The site keeps rendering
   from `plugins.json`, so the switchover carries no risk of a blank home page.
   `__tests__/pluginCatalogue.test.ts` fails if the two ever disagree, so the
   duplication cannot silently rot.
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
3. **Reviews** — ratings, aggregates, verified marks, author responses,
   sort-by-rating in the catalogue.
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
