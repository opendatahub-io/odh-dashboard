# AutoRAG UI

A modern web interface for generating and visualizing AutoRAG (Automatic Retrieval-Augmented Generation) patterns. Built with React 18, TypeScript, and PatternFly components.

---

## Overview

The AutoRAG UI provides an intuitive interface for generating RAG patterns through automated evaluation and optimization. This standalone application integrates seamlessly with Kubeflow pipelines within the Open Data Hub ecosystem.

---

## Quick Start

```bash
cd packages/autorag/frontend
npm install && npm run start:dev
```

---

## Available Scripts

### Development

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm install`       | Install dependencies                     |
| `npm run start:dev` | Start webpack dev server with hot reload |

### Build & Bundle

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run build` | Production build to `dist/` directory |

### Testing

| Command             | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run test`      | Run all tests (lint, type-check, unit, cypress) |
| `npm run test:unit` | Run Jest unit tests                             |
| `npm run test:jest` | Run Jest with output                            |
| `npm run test:lint` | ESLint & Prettier validation                    |
| `npm run test:fix`  | Auto-fix linting and formatting issues          |

### Cypress E2E Testing

| Command                     | Description                            |
| --------------------------- | -------------------------------------- |
| `npm run cypress:open`      | Open Cypress test runner (interactive) |
| `npm run cypress:open:mock` | Open Cypress with mock data            |
| `npm run cypress:run`       | Run Cypress tests (headless)           |
| `npm run cypress:run:mock`  | Run Cypress with mock data (headless)  |
| `npm run test:cypress-ci`   | Full CI test suite with server         |

---

## Project Configuration

### Core Configuration Files

```text
autorag/frontend/
├── tsconfig.json          # TypeScript compiler options
├── jest.config.js         # Jest testing configuration
├── .eslintrc.cjs         # ESLint rules and plugins
├── .prettierrc           # Code formatting rules
├── babel.config.js       # Babel transpiler config
└── config/
    ├── webpack.dev.js    # Development webpack config
    ├── webpack.prod.js   # Production webpack config
    └── webpack.common.js # Shared webpack config
```

---

## Working with Assets

### Image Assets

**PatternFly assets** - Use the `@assets` alias:

```typescript
import chartIcon from '@assets/images/chart.png';

<img src={chartIcon} alt="Chart visualization" />
```

**Local app assets** - Use the `~/app` alias:

```typescript
import logo from '~/app/assets/images/autorag-logo.png';

<img src={logo} alt="AutoRAG logo" />
```

### SVG Images

**Inline SVG:**

```typescript
import icon from '~/app/assets/icons/workflow.svg';

<span dangerouslySetInnerHTML={{ __html: icon }} />
```

> **⚠️ Security Note**: This pattern is safe only for SVG files imported at build time via webpack. Never use `dangerouslySetInnerHTML` with SVG content from external or user-supplied sources.

**CSS background SVG** (must be in `bgimages/` directory):

```css
.workflow-container {
  background-image: url(./assets/bgimages/pattern.svg);
}
```

> **Note**: SVG files for CSS backgrounds must be in a `bgimages/` directory. This is configured in `webpack.common.js` to differentiate from inline SVG usage.

---

## Styling & CSS

### Custom CSS from Third-Party Packages

When importing CSS from a new npm package, you may encounter webpack errors. Register the package's stylesheet path in `config/stylePaths.js` to enable proper CSS module parsing.

### Theming

The AutoRAG UI supports theming through environment variables:

```bash
STYLE_THEME=patternfly-theme npm run start:dev
```

---

## Code Quality & Tooling

This project maintains high code quality standards through automated tooling:

| Tool           | Purpose                          | Configuration            |
| -------------- | -------------------------------- | ------------------------ |
| **ESLint**     | Code linting & style enforcement | `.eslintrc.cjs`          |
| **Prettier**   | Code formatting                  | `.prettierrc`            |
| **TypeScript** | Static type checking             | `tsconfig.json`          |
| **Jest**       | Unit testing & coverage          | `jest.config.js`         |
| **Cypress**    | E2E testing & component testing  | `src/__tests__/cypress/` |

---

## Architecture Notes

### Module Federation

This application uses Webpack's Module Federation for:

- Dynamic module loading
- Shared dependencies across micro-frontends
- Runtime integration with the main ODH Dashboard

### Component Library Strategy

- **Primary**: PatternFly components for ODH consistency
- **Secondary**: Material UI for specialized components
- Custom components extend PatternFly patterns

---

## License

Apache-2.0 - See the [LICENSE](../../../LICENSE) file for details.
