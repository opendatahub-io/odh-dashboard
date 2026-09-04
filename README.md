[Dev setup & Requirements]: docs/dev-setup.md
[Dashboard documentation]: docs/README.md
[contributing guidelines]: CONTRIBUTING.md
[issue]: https://github.com/opendatahub-io/odh-dashboard/issues/new/choose
[definition of ready]: docs/definition-of-ready.md

# Open Data Hub Dashboard

[![codecov](https://codecov.io/gh/opendatahub-io/odh-dashboard/graph/badge.svg)](https://codecov.io/gh/opendatahub-io/odh-dashboard)
[![AgentReady](https://img.shields.io/badge/AgentReady-75.4%25-brightgreen)](https://github.com/opendatahub-io/odh-dashboard/blob/main/AGENTS.md)

A dashboard for Open Data Hub components, featuring user flows to navigate and interact with the various component parts of the stack.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 22.0.0
- **npm**: >= 10.9.2
- **Go**: >= 1.26 (for packages with Backend-for-Frontend services)

For detailed development setup requirements, see [Dev setup & Requirements].

## Installation

```bash
# Clone the repository
git clone https://github.com/opendatahub-io/odh-dashboard.git
cd odh-dashboard

# Install dependencies (installs all workspace dependencies)
pnpm install

# Copy environment configuration
cp .env.local.example .env.local
```

## Quick Start

Start the development server with hot-reloading:

```bash
# Start both frontend and backend in development mode
pnpm run dev

# The dashboard will be available at:
# - Frontend: http://localhost:4010
# - Backend API: http://localhost:4000
```

## Usage

### Development Commands

```bash
# Start development server (frontend + backend)
pnpm run dev

# Build all packages
pnpm run build

# Run all tests
pnpm run test

# Run tests for a specific workspace
pnpm run test:frontend
pnpm run test:backend

# Lint all packages
pnpm run lint

# Type check all packages
pnpm run type-check

# Format code
pnpm run format
```

### Working with Individual Packages

```bash
# Run commands in a specific workspace
cd frontend && pnpm run start:dev
cd backend && pnpm run start:dev
cd packages/gen-ai && pnpm run build
```

### Build for Production

```bash
# Build all packages
pnpm run build

# Start production build
pnpm run start
```

## Project Structure

This is a **monorepo** using pnpm workspaces and Turbo for orchestration:

```
odh-dashboard/
├── frontend/           # Main dashboard frontend (React + Module Federation)
├── backend/            # Main dashboard backend (Node.js/Express)
├── packages/           # Feature packages (~25 packages)
│   ├── gen-ai/        # Generative AI features (has BFF)
│   ├── model-registry/# Model Registry UI (has BFF)
│   ├── model-serving/ # Model Serving UI
│   ├── maas/          # Model-as-a-Service (has BFF)
│   └── ...            # Other feature packages
├── docs/              # Documentation
├── .github/           # GitHub workflows
└── .tekton/           # Tekton CI/CD pipelines
```

Key technologies:
- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **PatternFly v6** - UI components
- **Module Federation** - Runtime code sharing
- **Turbo** - Monorepo task orchestration
- **Cypress** - E2E testing
- **Jest** - Unit testing

## Testing

```bash
# Run all tests
pnpm run test

# Unit tests
pnpm run test-unit
pnpm run test-unit-coverage

# Frontend tests
pnpm run test:frontend
pnpm run test:frontend:coverage

# Backend tests
pnpm run test:backend
pnpm run test:backend:unit-coverage

# E2E tests (Cypress)
pnpm run test:cypress-ci

# Contract tests
pnpm run test:contract
```

See [docs/testing.md](docs/testing.md) for comprehensive testing guide.

## Contributing

Individual bug fixes are welcome, it is recommended that you create a bug [issue] at the same time to describe the fix you're applying. If you are unsure how best to solve it, start with the issue and note your desire to contribute.

Large feature implementations will need to go through our internal [definition of ready] to make sure we align with the wider architectural design.

To start a conversation on implementing a feature for the Dashboard, open up a feature request [issue].

We also have some [contributing guidelines] you can follow.

## Documentation

To get the current commit hash from the UI, to confirm which code is deployed, the commit hash is printed to the console every time the About Dialog is opened.

Read more about the Dashboard in one of our documentation links:

* [Dev setup & Requirements]
* [Dashboard documentation]

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
