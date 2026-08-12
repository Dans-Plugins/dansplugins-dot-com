# Dan's Plugins Community Website

## Description

Dan's Plugins Community Website is the central hub for the Dan's Plugins Community. It showcases DPC plugins, provides links to documentation and support resources, and acts as the public face of the community at [https://dansplugins.com](https://dansplugins.com).

This repository holds both halves of the site:

| Path | What it is | Toolchain |
| --- | --- | --- |
| repository root | The Next.js front end (`pages/`, `components/`, `services/`, `utils/`) | Node.js 18+ |
| [`dpc-api/`](dpc-api/README.md) | The Spring Boot back end serving community data (accounts, likes, factions, the plugin catalogue) | Java 17, Maven (via the bundled `./mvnw`) |

Front-end work needs only Node.js. Back-end work also needs Java 17. Running the whole stack locally is easiest with Docker Compose — see [Development](#development).

## Installation

### First Time Installation

These steps run the front end on its own. Features backed by the API (accounts, likes, the leaderboard) need `dpc-api` running too; see [Development](#development).

1. Ensure [Node.js](https://nodejs.org/en/) (v18 or later) is installed on your machine.
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

### Docker Compose (Recommended for Development)

See the [Development](#development) section below.

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

### Backend

If the change touches `dpc-api/`:

    cd dpc-api && ./mvnw verify

CI runs the front-end checks and this one as separate jobs on every pull request.

## Development

### Hot-Reloading Dev Server

`npm run dev` is the hot-reloading path — edits are picked up without a restart:

    npm run dev

On its own it serves the front end only, against whatever `NEXT_PUBLIC_API_URL` points at.

### Full Local Stack (Docker Compose)

Docker Compose brings up the site together with `dpc-api`, its database, and the UserAuth service the API delegates authentication to. The site runs as a **production build** here, so it does *not* hot-reload: source is copied into the image, and changes need a rebuild (`./up.sh` rebuilds).

#### Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Set `JWT_SECRET` — the stack will not start without it. Either export it, or put it in a `.env` file in the project root (git-ignored):
   ```bash
   export JWT_SECRET="your-secret-key-at-least-32-bytes-long"
   ```
   See [CONFIG.md](CONFIG.md#jwt_secret) for what it does and the other variables available.
3. Start the stack:
   ```bash
   ./up.sh
   ```
   The site will be accessible at `http://localhost:3000` and the API at `http://localhost:45345`.

#### Stopping the Server

    ./down.sh

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
