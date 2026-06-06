# Dan's Plugins Community Website

## Description

Dan's Plugins Community Website is a Next.js web application that serves as the central hub for the Dan's Plugins Community. It showcases DPC plugins, provides links to documentation and support resources, and acts as the public face of the community at [https://dansplugins.com](https://dansplugins.com).

## Installation

### First Time Installation

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

Linux:

    npm run lint

Windows:

    npm run lint

If you see no errors, the lint check has passed.

### Unit Tests

The frontend uses [Vitest](https://vitest.dev/) for unit tests. Run the suite with:

    npm test

Test files live in the `__tests__/` directory. If all tests pass, the suite has succeeded.

## Development

### Test Server with Hot-Reloading

A Docker Compose setup is available for local development.

#### Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Start the development server:
   ```bash
   ./up.sh
   ```
   The site will be accessible at `http://localhost:3000`.

#### Stopping the Server

    ./down.sh

#### Manual npm Dev Server

    npm run dev

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
