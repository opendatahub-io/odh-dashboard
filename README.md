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
- **Go**: >= 1.24 (for packages with Backend-for-Frontend services)

For detailed development setup requirements, see [Dev setup & Requirements].

## Installation

```bash
# Clone the repository
git clone https://github.com/opendatahub-io/odh-dashboard.git
cd odh-dashboard

# Install dependencies (installs all workspace dependencies)
npm install

# Copy environment configuration
cp .env.local.example .env.local
```

## Quick Start

Start the development server with hot-reloading:

```bash
# Start both frontend and backend in development mode
npm run dev

# The dashboard will be available at:
# - Frontend: http://localhost:4010
# - Backend API: http://localhost:4000
```

## Usage

### Development Commands

```bash
# Start development server (frontend + backend)
npm run dev

# Build all packages
npm run build

# Run all tests
npm run test

# Run tests for a specific workspace
npm run test:frontend
npm run test:backend

# Lint all packages
npm run lint

# Type check all packages
npm run type-check

# Format code
npm run format
```

### Working with Individual Packages

```bash
# Run commands in a specific workspace
cd frontend && npm run start:dev
cd backend && npm run start:dev
cd packages/gen-ai && npm run build
```

### Build for Production

```bash
# Build all packages
npm run build

# Start production build
npm run start
```

## Project Structure

This is a **monorepo** using npm workspaces and Turbo for orchestration:

```
odh-dashboard/
├── frontend/           # Main dashboard frontend (React + Webpack Module Federation)
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
- **Webpack Module Federation** - Runtime code sharing
- **Turbo** - Monorepo task orchestration
- **Cypress** - E2E testing
- **Jest** - Unit testing

## Testing

```bash
# Run all tests
npm run test

# Unit tests
npm run test-unit
npm run test-unit-coverage

# Frontend tests
npm run test:frontend
npm run test:frontend:coverage

# Backend tests
npm run test:backend
npm run test:backend:unit-coverage

# E2E tests (Cypress)
npm run test:cypress-ci

# Contract tests
npm run test:contract
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
