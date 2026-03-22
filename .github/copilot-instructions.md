# Copilot Instructions

This repository follows the DPC (Dans Plugins Community) conventions defined at
https://github.com/Dans-Plugins/dpc-conventions. Read those conventions before
making any changes.

## Technology Stack

- Language: TypeScript
- Framework: Next.js (React)
- Build tool: npm
- Styling: MUI (Material UI) with Emotion
- Target platform: Node.js web server / static export

## Project Structure

- `pages/` – Next.js pages (each file is a route)
- `components/` – Reusable React components
- `styles/` – Global CSS styles
- `public/` – Static assets served at the root URL
- `utils/` – Shared utility functions
- `services/` – Data-fetching or business-logic services

## Coding Conventions

- Use TypeScript for all new files.
- Follow the existing component structure when adding new pages or components.
- Use MUI components for UI elements to stay consistent with the existing design.
- Keep user-facing text in components readable and consistent with the site's tone.
- Do not hard-code environment-specific values; use environment variables instead.

## Contribution Workflow

- Branch from `develop` for all changes.
- Open a pull request against `develop`, not `main`.
- Reference the related GitHub issue in every pull request description.
