# Contributing

## Thank You

Thank you for your interest in contributing to the Dan's Plugins Community Website! This guide will help you get started.

## Links

- [Website](https://dansplugins.com)
- [Discord](https://discord.gg/xXtuAQ2)

## Requirements

- A GitHub account
- Git installed on your local machine
- [Node.js](https://nodejs.org/en/) (v18 or later, to match CI/Docker)
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

1. Make sure an issue exists for the work. If not, create one.
2. Switch to `develop`: `git checkout develop`
3. Create a branch: `git checkout -b <branch-name>`
4. Make your changes.
5. Test your changes (see [Testing](#testing)).
6. Commit: `git commit -m "Description of changes"`
7. Push: `git push origin <branch-name>`
8. Open a pull request against `develop`, link the related issue with `#<number>`.
9. Address review feedback.

## Testing

Run the linter with:

`npm run lint`

For manual testing, start the development server:

    npm run dev

Or use Docker Compose:

    docker compose up

## Questions

Ask in the [Discord server](https://discord.gg/xXtuAQ2).
