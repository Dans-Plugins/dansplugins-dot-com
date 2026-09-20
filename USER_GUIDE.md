# User Guide

This guide is intended for server operators and community members visiting [dansplugins.com](https://dansplugins.com).

## Prerequisites

No special software is required to use the website. Simply visit [https://dansplugins.com](https://dansplugins.com) in any modern web browser.

## First Steps

1. Open your web browser and navigate to [https://dansplugins.com](https://dansplugins.com).
2. Browse the list of available DPC plugins on the home page.
3. Each plugin has its own card. Use the buttons at the bottom of a card to learn more: **Details** opens that plugin's own page on this site, **Guide** opens its user guide, and **GitHub** takes you to its source code and releases.

## Common Scenarios

### Finding a Plugin

1. Visit the [home page](https://dansplugins.com).
2. Browse the plugin cards displayed on the page, or narrow them down:
   - Type in the **Search plugins…** box to filter by plugin name or description. A "Showing N of M plugins" count appears while a search is active, and the ✕ clears it.
   - Use the **By Popularity** / **Most Liked** / **Most Downloaded** / **Alphabetical** buttons to reorder the catalogue. Popularity is by bStats server count; Most Downloaded is by downloads made through this site.
   - Click a **tag** (admin, factions, survival, …) to show only plugins for that purpose; click it again, or **All**, to clear it. Each card lists its own tags, and clicking one there does the same.
   - Pick a **Minecraft version** to show only plugins whose SpigotMC page lists that version as tested. A plugin whose tested versions are not known is left out rather than assumed to work — the answer to "does this run on my server?" is a no, not a guess.
   - Search, tag and version combine, and the search box also matches tags. A "Showing N of M plugins" line appears while any of them is active; if nothing matches, **Clear filters** resets all three.
3. A card may carry a few small chips between the description and the buttons, each shown only when the figure behind it is available:
   - **N servers** — how many servers are running the plugin, as reported by bStats. Plugins with no bStats project, or none reporting yet, show no such chip.
   - **Latest: vX.Y.Z** — the plugin's newest release. A plugin that has published no release, or whose releases have not yet been mirrored from GitHub, shows no such chip.
   - **N downloads** — how many times the plugin has been downloaded through this site, once it has been.
   - **MC 1.18–1.20** — the Minecraft versions the plugin has been tested on, as listed on its SpigotMC page. An unbroken run is shown as a range; versions with a gap between them are listed separately, so "1.16, 1.21" means exactly those two. A plugin with no SpigotMC page shows no such chip.
   - **★ 4.7** — the plugin's average rating on SpigotMC, shown once it has at least three reviews there. Hover the chip for the number of reviews. This is SpigotMC's figure, not this site's; the plugin's own page links to the reviews behind it.

   These figures are repeated on the plugin's own page (see below), so there is no need to open it just to read them.
4. Once you have found a plugin, use the buttons on its card:
   - **Details** — that plugin's own page on this site (see below). Its name is a link to the same place.
   - **Download** — the latest release's plugin jar, straight from GitHub; the same file Dan's Plugin Manager would install. The button is shown only when the release named by the **Latest** chip attaches a jar, and the file is served by GitHub, not by this site.
   - **Guide** — that plugin's user guide, on this site.
   - **GitHub** — the plugin's source code and releases.
   - **SpigotMC** — the plugin's SpigotMC resource page, shown for plugins that have one.
   - The heart records the plugin in your **My likes** list; you will be prompted to sign in first if you are not already.

### Viewing a Plugin's Page

1. From the home page, click a plugin's name or its **Details** button (or visit `/resources/<plugin>` directly — for example `/resources/medieval-factions`).
2. The page shows the plugin's description, how many servers are running it, its latest release version, how many times its mirrored releases have been downloaded from GitHub, the Minecraft versions it has been tested on, and — for plugins with at least three reviews on SpigotMC — their SpigotMC rating and download count, along with the heart to like it. The rating chip opens the reviews on SpigotMC; it is their figure, shown here until this site has reviews of its own. A line beneath states when the plugin was first released and last updated, as its GitHub releases record it; either half is left out when it is not known. The plugin's tags follow its description. Below those, a **Downloads** box counts downloads made through this site the way SpigotMC counts its own: the total across every release, and the latest release's.
3. Use the buttons to act on it:
   - **Download** — the plugin's releases on GitHub, where its builds are published. The website does not host plugin files itself.
   - **User guide** — the same guide reachable from the Guides page.
   - **Source** — the plugin's source code.
   - **SpigotMC** — its SpigotMC page, for plugins that have one.
4. **Related plugins** lists the plugins that share a tag with this one, those with the most in common first — Currencies and Fiefs both extend Medieval Factions, for instance, and each names the other here. Plugins sharing no tag with anything show no such section.
5. Under **Versions**, the newest release is shown open, with its release notes, how many times it has been downloaded through this site, and a download button for each file it publishes; earlier releases sit below it and expand when clicked. Every download link leads to the file on GitHub — the site only counts the download on the way past. Plugins that have never published a release show no Versions section.
5. At the bottom, **Report a bug** opens a new issue on that plugin's issue tracker, and **Suggest a feature** goes to the Dev Portal, where ideas can be submitted and upvoted.

### Reading the Latest News

1. Click **News** in the top navigation bar (or visit `/news`).
2. Browse the posts, shown newest first.

### Browsing Plugin Guides

1. Click **Guides** in the top navigation bar (or visit `/guides`).
2. Select a plugin from the list to open that plugin's user guide on-site (with a "View on GitHub" link if you want the raw source).
3. A guide often links to the plugin's other documents, such as its command or configuration reference. Those live in the plugin's repository, so they open on GitHub in a new tab; links within the same guide jump down the page as usual.

### Viewing the Faction Leaderboard

1. Click **Leaderboard** in the top navigation bar (or visit `/leaderboard`).
2. Review the factions, ranked by number of members across all servers.

### Learning About the Community

1. Click **About** in the top navigation bar (or visit `/about`).
2. Read the overview of Dan's Plugins Community.
3. Use the GitHub, Discord, or Patreon links to get involved.

### Viewing the Road Map

1. Click **Road Map** in the top navigation bar (or visit `/roadmap`).
2. Review the planned, in-progress, and completed work.
3. Follow the linked GitHub issue tracker for day-to-day detail.

### Requesting a Commission

1. Click **Commissions** in the top navigation bar (or visit `/commissions`).
2. Review the pricing options, what's included, and the current availability status.
3. Click **Join the Commissions Discord** to discuss your project.

### Managing Your Account

1. Click **Account** in the top navigation bar (or visit `/account`).
2. Register a new account, or log in with an existing username and password.
3. Once logged in, create or delete the API keys used to connect a server to the DPC community data API.
4. The **My likes** section lists the plugins and guides you've liked, linking to each one — your personal toolbox.
5. Click **View your public profile** to see your profile as other people see it (display name, avatar, bio, join date, badges, and likes). Anyone can view a user's public profile at `/u/<username>`. Badges are earned automatically — for example, **Server Owner** appears once you have created an API key for a server.

### Getting Support

If you need help with any DPC plugin, join the community Discord:

1. Click the Discord link displayed on the site or visit [https://discord.gg/xXtuAQ2](https://discord.gg/xXtuAQ2).
2. Browse the relevant plugin channel.
3. Ask your question.

### Reporting a Website Bug

If you find a bug on the website itself:

1. Go to the [GitHub Issues page](https://github.com/Dans-Plugins/dansplugins-dot-com/issues).
2. Click **New Issue**.
3. Describe the problem and include steps to reproduce it.
