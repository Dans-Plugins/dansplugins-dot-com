# Dan's Plugins Community Website

## Description

Dan's Plugins Community Website is the central hub for the Dan's Plugins Community. It showcases DPC plugins, provides links to documentation and support resources, and acts as the public face of the community at [https://dansplugins.com](https://dansplugins.com).

<p align="center">
  <a href="docs/images/home-desktop.jpg"><img src="docs/images/home-desktop.jpg" alt="The dansplugins.com home page in light mode: a blue navigation bar above a grid of plugin icons headed Established, including Medieval Factions, Wild Pets, SimpleSkills and Currencies" width="620"></a>
  <a href="docs/images/home-phone.jpg"><img src="docs/images/home-phone.jpg" alt="The home page on a phone: the plugin icon grid four icons per row under a compact top bar with a menu button" width="180"></a>
</p>
<p align="center"><em>The live site at <a href="https://dansplugins.com">dansplugins.com</a>: every plugin as an icon, sorted into Established, Growing and Early releases, on a computer and a phone.</em></p>

<p align="center">
  <img src="docs/images/browse.gif" alt="Animation: the pointer moves across the home page's icon grid, opening the panels for Medieval Factions, Wild Pets, SimpleSkills, Currencies and Fiefs in turn, each with a still from its preview clip" width="720">
</p>
<p align="center"><em>Browsing the catalogue: hovering an icon opens the plugin's panel, with its preview, live figures and links.</em></p>

See [A tour of the site](#a-tour-of-the-site) for every page.

This repository holds both halves of the site:

| Path | What it is | Toolchain |
| --- | --- | --- |
| repository root | The Next.js front end (`pages/`, `components/`, `services/`, `utils/`) | Node.js 18.17+ |
| [`dpc-api/`](dpc-api/README.md) | The Spring Boot back end serving community data (accounts, likes, factions, the plugin catalogue) | Java 17, Maven (via the bundled `./mvnw`) |

Front-end work needs only Node.js, though most pages have little to show until a `dpc-api` answers (see [First Time Installation](#first-time-installation)). Back-end work also needs Java 17. Running the whole stack locally is easiest with Docker Compose — see [Development](#development).

## A tour of the site

Every image below is a real capture of the live site (click one for full size). They are regenerated from a committed shot list; see [Regenerating screenshots](#regenerating-screenshots).

### Finding a plugin

<table>
<tr>
  <td width="33%" valign="top"><a href="docs/images/home-panel.jpg"><img src="docs/images/home-panel.jpg" alt="The Medieval Factions hover panel on the home page: a still from its chat preview clip (a faction claim map), its description, tags, chips for servers, latest version, downloads, tested Minecraft version and rating, and Details, Download, Guide, GitHub and SpigotMC buttons" width="260"></a><br><sub>Hovering an icon opens its panel: preview, description, figures, and Details / Download / Guide / GitHub buttons.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/home-filter.jpg"><img src="docs/images/home-filter.jpg" alt="The home page with Search and filter unfolded: a search box, By Popularity, Most Liked, Most Downloaded and Alphabetical sort buttons, a row of tag chips with factions selected, and the grid narrowed to faction plugins" width="260"></a><br><sub>Search & filter: search box, sort order, tag chips and a Minecraft version picker (here the factions tag is on).</sub></td>
  <td width="33%" valign="top"><a href="docs/images/home-dark.jpg"><img src="docs/images/home-dark.jpg" alt="The home page in dark mode: the plugin icon grid on a near-black background" width="260"></a><br><sub>The same page in dark mode (the sun/moon switch in the navigation bar, remembered per browser).</sub></td>
</tr>
</table>

### A plugin's page

<table>
<tr>
  <td width="33%" valign="top"><a href="docs/images/plugin-page.jpg"><img src="docs/images/plugin-page.jpg" alt="The Medieval Factions page: icon and title with a like button, chips for servers, latest version, GitHub and SpigotMC downloads, tested Minecraft version and SpigotMC rating, a Downloads from this site box, the description, tags and Download, User guide, Source and SpigotMC buttons" width="260"></a><br><sub>A plugin's own page: live figures, download counts, tags and links.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/plugin-preview.jpg"><img src="docs/images/plugin-preview.jpg" alt="The preview section of the Medieval Factions page: a recreated Minecraft chat panel showing the /mf map claim grid, captioned as real server output, above a 3D render of example factions' claims over a Minecraft world" width="260"></a><br><sub>Preview clips and world renders, captioned with how each was made.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/plugin-versions.jpg"><img src="docs/images/plugin-versions.jpg" alt="The Versions section of the Medieval Factions page: a Development build card marked Pre-release with a warning and the /dpm command to install it, then collapsed release rows (11.2.0 marked Latest, 11.1.1, 11.1.0 and older) with dates and download counts" width="260"></a><br><sub>Versions: a clearly marked development build, then every release with its date and download count; each row expands to its notes and files.</sub></td>
</tr>
</table>

### Guides, releases and news

<table>
<tr>
  <td width="33%" valign="top"><a href="docs/images/guides.jpg"><img src="docs/images/guides.jpg" alt="The Guides page: an alphabetical list of plugin guides, from Activity Tracker Guide to Fiefs Guide" width="260"></a><br><sub>Guides: every plugin's user guide, read on-site.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/guide-page.jpg"><img src="docs/images/guide-page.jpg" alt="The Medieval Factions Guide rendered on the site: All guides and plugin page links, a like button, and the guide's table of contents" width="260"></a><br><sub>A plugin guide, rendered on-site from its repository.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/releases.jpg"><img src="docs/images/releases.jpg" alt="The How releases work page: an introduction, the Stable and Dev channels, and cards for the API-compatibility check and Boot gate" width="260"></a><br><sub>How releases work: the two channels and the gates a stable release must pass.</sub></td>
</tr>
<tr>
  <td width="33%" valign="top"><a href="docs/images/news.jpg"><img src="docs/images/news.jpg" alt="The News page: two announcement cards, Community Data API and Factions Leaderboard, and New About, Road Map, and Commissions Pages" width="260"></a><br><sub>News, newest first.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/roadmap.jpg"><img src="docs/images/roadmap.jpg" alt="The Roadmap page: an In Progress section with Badges and Roles on Profiles, then Planned items such as Plugin Reviews, Verified Reviews and Plugin Discussion" width="260"></a><br><sub>The Roadmap: planned, in-progress and completed work (in the Community menu).</sub></td>
  <td width="33%" valign="top"><a href="docs/images/about.jpg"><img src="docs/images/about.jpg" alt="The About Us page introducing Dan's Plugins Community, with GitHub, Discord and Patreon buttons" width="260"></a><br><sub>About the community, with GitHub, Discord and Patreon links.</sub></td>
</tr>
</table>

### Community data

<table>
<tr>
  <td width="33%" valign="top"><a href="docs/images/usage.jpg"><img src="docs/images/usage.jpg" alt="The Plugin usage page with a notice that usage figures are not available right now, above plugin rows that each say No usage figures available" width="260"></a><br><sub>Plugin usage, shot while trace could not be reached: the page says the figures are unavailable instead of showing zeros. With trace up, each plugin shows its active servers and a 30-day trend.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/leaderboard.jpg"><img src="docs/images/leaderboard.jpg" alt="The Faction Leaderboard: a table of factions ranked by member count, each with its server name, a copyable server address and a Discord link" width="260"></a><br><sub>The faction leaderboard, built from data Medieval Factions servers publish.</sub></td>
  <td width="33%" valign="top"><a href="docs/images/dev-portal.jpg"><img src="docs/images/dev-portal.jpg" alt="The Developer Portal: totals for open issues, open pull requests, drafts and the oldest open item, then a table of repositories with issue counts and a triage signal" width="260"></a><br><sub>The Dev Portal: every open issue and pull request across the organization at a glance (in the Community menu).</sub></td>
</tr>
<tr>
  <td width="33%" valign="top"><a href="docs/images/commissions.jpg"><img src="docs/images/commissions.jpg" alt="The Commissions page marked Open for commissions: a pricing table for Fork and Repair and Custom Plugin work, a What's included list and a Join the Commissions Discord button" width="260"></a><br><sub>Commissions: pricing, what is included and availability (in the Community menu).</sub></td>
  <td width="33%" valign="top"><a href="docs/images/account.jpg"><img src="docs/images/account.jpg" alt="The Account page signed out: Sign in and Create account tabs above a username and password form, with a link for resetting a forgotten password" width="260"></a><br><sub>Sign in or create an account (for likes, API keys and a public profile).</sub></td>
  <td width="33%" valign="top"><a href="docs/images/community-menu.jpg"><img src="docs/images/community-menu.jpg" alt="The home page with the Community menu open in the top navigation bar, listing Roadmap, Commissions and Dev Portal, then external community links" width="260"></a><br><sub>The Community menu in the top bar: Roadmap, Commissions and the Dev Portal, plus the community's Discord, Patreon and other links.</sub></td>
</tr>
</table>

### On a phone

At phone width the hover panel becomes a bottom sheet and the navigation moves into a drawer.

<table>
<tr>
  <td width="25%" valign="top"><a href="docs/images/home-phone.jpg"><img src="docs/images/home-phone.jpg" alt="The home page on a phone: the plugin icon grid four icons per row under a compact top bar with a menu button" width="180"></a><br><sub>Phone width: four icons a row, navigation behind the menu button.</sub></td>
  <td width="25%" valign="top"><a href="docs/images/phone-sheet.jpg"><img src="docs/images/phone-sheet.jpg" alt="A bottom sheet on a phone showing Wild Pets: its description, tags, chips for servers, latest version, downloads, tested versions and rating, and Details, Download, Guide, GitHub and SpigotMC buttons, over the dimmed icon grid" width="180"></a><br><sub>On a phone, a tap opens the plugin's details in a sheet at the bottom of the screen.</sub></td>
  <td width="25%" valign="top"><a href="docs/images/phone-menu.jpg"><img src="docs/images/phone-menu.jpg" alt="The navigation drawer open on a phone, listing Home, News, Guides, Leaderboard, About, Roadmap, Commissions, Dev Portal and Sign in, then Community links to Discord, Patreon, LinkedIn and RPKit" width="180"></a><br><sub>The phone navigation drawer: every page, including the Community menu's Roadmap, Commissions and Dev Portal.</sub></td>
  <td width="25%" valign="top"><a href="docs/images/phone-plugin-dark.jpg"><img src="docs/images/phone-plugin-dark.jpg" alt="The Medieval Factions page on a phone in dark mode: the plugin icon and title, chips for servers, latest version and downloads, and the Download and User guide buttons" width="180"></a><br><sub>A plugin page on a phone, in dark mode.</sub></td>
</tr>
</table>

## Installation

### First Time Installation

These steps run the front end on its own. The plugin catalogue comes from the API, so without `dpc-api` running the home page and the Guides page say the catalogue could not be loaded, and every `/resources/<plugin>` and `/guides/<plugin>` page is a 404. Accounts, likes and the leaderboard need it too. See [Development](#development) for running both.

1. Ensure [Node.js](https://nodejs.org/en/) (v18.17 or later, the floor Next.js 14 requires) is installed on your machine.
2. Clone this repository: `git clone https://github.com/Dans-Plugins/dansplugins-dot-com.git`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm run start
   ```

The site will be available at `http://localhost:3000`.

### Other Ways to Run It

`npm run dev` is the day-to-day development server, and Docker Compose brings up the whole stack including `dpc-api`. See the [Development](#development) section below for both.

## Usage

### Documentation

- [User Guide](USER_GUIDE.md) – Getting started and common scenarios
- [Configuration Guide](CONFIG.md) – Detailed configuration options
- [API Documentation](dpc-api/README.md) – The `dpc-api` back end: endpoints, configuration and local setup
- [Resource Hub Design](RESOURCE_HUB.md) – How the plugin catalogue grows into full resource pages
- [Changelog](CHANGELOG.md) – Release history

### Website

- [dansplugins.com](https://dansplugins.com)

## Support

You can find the support Discord server [here](https://discord.gg/xXtuAQ2).

### Experiencing a bug?

Please fill out a bug report [here](https://github.com/Dans-Plugins/dansplugins-dot-com/issues/new).

- [Known Bugs](https://github.com/Dans-Plugins/dansplugins-dot-com/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

## Usage reporting

When the server is given a trace key in `USAGE_REPORTING_KEY`, it reports one `page-view` event per
HTML page it serves to [trace](https://trace.danielstephenson.dev), as the program `dansplugins-dot-com`,
carrying the page's path (for example `/about` — never a query string or fragment) and the site
version. Public profile pages are recorded as `/u/[username]`, never with the username. Nothing about the visitor is sent: no IP address, user agent, cookie, session, account or
referrer. No script is added to any page — the report is made by the server (Next.js middleware),
so the key never reaches the browser — and crawlers, uptime monitors, prefetches, API calls,
assets and 404s are not counted.

Every page view also carries a random **installation ID** for the server (the tag `install`), so
trace can count installations of the site rather than raw events. It is a UUID made when the
server first reports, derived from nothing about the server or any visitor. `TRACE_INSTALL_ID`,
when set, is used as is; otherwise the client is pointed at
`$XDG_DATA_HOME/dansplugins-dot-com/trace-install-id` (or `~/.local/share/dansplugins-dot-com/trace-install-id`).
The report is made from Next.js middleware, which runs in the Edge runtime and has no file system,
so in practice the ID lives in memory for the life of the server process: each restart or redeploy
counts as a new installation unless `TRACE_INSTALL_ID` is set. To reset it, restart the server or
change `TRACE_INSTALL_ID` (or delete the file, where a runtime with file access created one). Every
switch below also stops it: with reporting off no ID is made, read or written.

Reporting is off unless a key is set, and any of these turns it off:

- `USAGE_REPORTING_ENABLED=false` in the server's environment (set to any value but `true`, `on`,
  `yes` or `1` turns it off, so empty, `off`, `disabled` or a typo does too)
- `TRACE_USAGE_REPORTING=off` in the environment (any value but empty, `true`, `on`, `yes` or `1`;
  shared by every program that reports to trace, and it wins over the setting above)
- `DO_NOT_TRACK=1` in the environment (any value but empty, `0`, `false`, `off` or `no`; see
  [consoledonottrack.com](https://consoledonottrack.com))
- leaving `USAGE_REPORTING_KEY` unset

`USAGE_REPORTING_ENDPOINT` sends the reports to a different trace server. With a key set, the
server logs one line on its first request saying whether reporting is on and, if it is off, which
switch turned it off. Details: https://danielstephenson.dev/usage-reporting

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [Notes for Developers](https://github.com/Dans-Plugins/dansplugins-dot-com/wiki)

## Testing

### Lint

    npm run lint

If you see no errors, the lint check has passed.

### Unit Tests

The frontend uses [Vitest](https://vitest.dev/) for unit tests. Run the suite with:

    npm test

Test files live in the `__tests__/` directory. If all tests pass, the suite has succeeded.

### Backend (`dpc-api/`)

If the change touches `dpc-api/`:

    cd dpc-api && ./mvnw verify

CI runs the front-end checks and this one as separate jobs on every pull request.

## Development

### Hot-Reloading Dev Server

`npm run dev` is the hot-reloading path — edits are picked up without a restart:

    npm run dev

On its own it serves the front end only, against whatever `NEXT_PUBLIC_API_URL` points at, so the plugin catalogue is missing unless a `dpc-api` answers there.

### Full Local Stack (Docker Compose)

Docker Compose brings up the site together with `dpc-api`, its database, and the UserAuth service the API delegates authentication to. The site runs as a **production build** here, so it does *not* hot-reload: source is copied into the image, and changes need a rebuild (`./up.sh` rebuilds).

#### Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Install the site's dependencies on the host:
   ```bash
   npm install
   ```
   This step is not optional: `compose.yml` bind-mounts `./node_modules` into the website container, so on a fresh clone with no host `node_modules` the container starts against an empty directory and fails to launch.
3. Set `JWT_SECRET` — the stack will not start without it. Either export it, or put it in a `.env` file in the project root (git-ignored):
   ```bash
   export JWT_SECRET="your-secret-key-at-least-32-bytes-long"
   ```
   See [CONFIG.md](CONFIG.md#jwt_secret) for what it does and the other variables available.
4. Start the stack:
   ```bash
   ./up.sh
   ```
   The site will be accessible at `http://localhost:3000` and the API at `http://localhost:45345`. The website container does not start until `dpc-api` reports healthy — which in turn waits on its database and on UserAuth — so expect a minute or so before `localhost:3000` answers on a cold start. The wait is deliberate: the home page's "Latest" chips and a resource page's Versions section are read from `dpc-api` while rendering, and a page served before the API was up would simply omit them.

#### Stopping the Server

    ./down.sh

### Regenerating screenshots

The images in this README and in [USER_GUIDE.md](USER_GUIDE.md) live in `docs/images/` and are shot from one committed shot list, [`docs/media.json`](docs/media.json), with [darkroom](https://github.com/Preponderous-Software/darkroom) (headless Chromium through Playwright). Each shot names its page, device (1280×800 desktop, 1280×900 for the hover shots so the whole panel fits, or a 390×844 phone at 3× pixel density), colour mode, any clicks or hovers, and its caption and alt text. darkroom fits every still under 200 KB and the GIF under 3 MB.

```bash
pip install "darkroom @ git+https://github.com/Preponderous-Software/darkroom@v0.7.1"
darkroom setup-web --install                          # once per machine: Playwright + Chromium for darkroom

darkroom check docs/media.json                        # validate the shot list
darkroom shoot docs/media.json --force                # reshoot everything from https://dansplugins.com
darkroom shoot docs/media.json --only plugin-page --force   # reshoot one image
darkroom shoot docs/media.json --out /tmp/review      # shoot into a scratch folder to look first
```

By default the shots are taken from the live site, since a front end without a `dpc-api` behind it shows empty states. To shoot a local build instead (an unreleased change, say), start it and pass its address: `darkroom shoot docs/media.json --force --var base=http://127.0.0.1:3000`. darkroom adds `darkroom-monitor` to the browser's user agent, so the site's usage reporting does not count the captures as visits. The shot list never signs in and never opens admin pages. Look at every image before committing it. darkroom keeps its take cache in `docs/.darkroom/`, which is git-ignored.

## Authors

### Developers

| Name | Main Contributions |
|------|--------------------|
| Dans | Project founder and lead developer |

## License

This project is licensed under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software, provided that the original copyright and license notice are included.

See the [LICENSE](LICENSE) file for the full text.

## Project Status

This project is in active development.
