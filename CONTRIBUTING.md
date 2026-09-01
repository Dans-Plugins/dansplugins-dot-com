# Contributing

## Thank You

Thank you for your interest in contributing to the Dan's Plugins Community Website! This guide will help you get started.

## Links

- [Website](https://dansplugins.com)
- [Discord](https://discord.gg/xXtuAQ2)

## Requirements

- A GitHub account
- Git installed on your local machine
- [Node.js](https://nodejs.org/en/) (v18.17 or later, the floor Next.js 14 requires; CI and Docker both run 18.x)
- Java 17, if the change touches the `dpc-api/` back end (Maven comes with the bundled `./mvnw`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop), to run the full stack locally
- A code editor (e.g. VS Code)
- A basic understanding of TypeScript and React

## Getting Started

1. [Sign up for GitHub](https://github.com/signup) if you don't have an account.
2. Fork the repository by clicking **Fork** at the top right of the repo page.
3. Clone your fork: `git clone https://github.com/<your-username>/dansplugins-dot-com.git`
4. Open the project in your editor.
5. Install dependencies: `npm install`
6. Start the development server: `npm run dev`
   If you encounter errors, please open an issue.

## Identifying What to Work On

### Issues

Work items are tracked as [GitHub issues](https://github.com/Dans-Plugins/dansplugins-dot-com/issues).

### Milestones

Issues are grouped into [milestones](https://github.com/Dans-Plugins/dansplugins-dot-com/milestones) representing upcoming releases.

## Making Changes

`main` is the trunk: branch from it and open your pull request back against it.
(A `develop` branch exists in the repository's history but is no longer used.)

1. Make sure an issue exists for the work. If not, create one.
2. Switch to `main`: `git checkout main`
3. Create a branch: `git checkout -b <branch-name>`
4. Make your changes.
5. Test your changes (see [Testing](#testing)).
6. Commit: `git commit -m "Description of changes"`
7. Push: `git push origin <branch-name>`
8. Open a pull request against `main`, link the related issue with `#<number>`.
9. Address review feedback.

## Testing

CI runs these checks on every pull request, so run them locally before pushing.

### Frontend

Run the linter with:

    npm run lint

Run the unit test suite (test files live in `__tests__/`):

    npm test

Make sure the site builds:

    npm run build

For manual testing, start the development server:

    npm run dev

Or bring up the full stack (site, API, databases, UserAuth) with Docker Compose. `JWT_SECRET` is required — Compose refuses to start without it — and `--build` matters, since the website image copies the source in at build time and will otherwise serve a cached build of the code as it was:

    npm install
    JWT_SECRET="your-secret-key-at-least-32-bytes-long" docker compose up --build

`npm install` is needed first because `compose.yml` bind-mounts `./node_modules` into the container. See [CONFIG.md](CONFIG.md#jwt_secret) for that variable and the rest of the configuration.

### Backend (`dpc-api/`)

If your change touches the Spring Boot backend in `dpc-api/`, run:

    cd dpc-api && ./mvnw verify

See [`dpc-api/README.md`](dpc-api/README.md) for more details.

## Questions

Ask in the [Discord server](https://discord.gg/xXtuAQ2).
