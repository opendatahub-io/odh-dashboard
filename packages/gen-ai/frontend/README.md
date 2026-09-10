# Chatbot UI

This project is a chatbot UI built with PatternFly, React, and TypeScript. It provides a modern, responsive interface, leveraging PatternFly's [Chatbot extension](https://www.patternfly.org/patternfly-ai/chatbot/overview) for a consistent look and feel.

## Quick-start

```bash
# Run from the odh-dashboard repository root
pnpm install
cd packages/gen-ai/frontend
pnpm run start:dev
```

## Development scripts

```sh
# Dependencies are installed from the repository root; see Quick-start above

# Start the development server
pnpm run start:dev

# Run a production build (outputs to "dist" dir)
pnpm run build

# Run the test suite
pnpm run test

# Run the test suite with coverage
pnpm run test:coverage

# Run the linter
pnpm run lint

# Run the code formatter
pnpm run format

# Launch a tool to inspect the bundle size
pnpm run bundle-profile:analyze

# Start the express server (run a production build first)
pnpm run start

# Run type checking without emitting files
pnpm run type-check

# Run all CI checks (type checking, linting, and test coverage)
pnpm run ci-checks

# Clean the dist directory
pnpm run clean

# Generate a rspack bundle profile
pnpm run build:bundle-profile

# Build a production bundle and serve it from the mock BFF
pnpm run cypress:server:build
pnpm run cypress:server

# Build, serve via mock BFF, and run Cypress mock tests (CI)
pnpm run test:cypress-ci
```

## Configurations

- [TypeScript Config](./tsconfig.json)
- [Rspack Config](./rspack.common.js)
- [Jest Config](./jest.config.js)
- [Editor Config](./.editorconfig)

## Raster image support

To use an image asset that's shipped with PatternFly core, you'll prefix the paths with "@assets". `@assets` is an alias for the PatternFly assets directory in node_modules.

For example:

```js
import imgSrc from '@assets/images/g_sizing.png';
<img src={imgSrc} alt="Some image" />;
```

You can use a technique to import assets from your local app, just prefix the paths with "~/app". `~/app` is an alias for the main src/app directory.

```js
import loader from '~/app/assets/images/loader.gif';
<img src={loader} alt="Content loading" />;
```

## Vector image support

Inlining SVG in the app's markup is also possible.

```js
import logo from '~/app/assets/images/logo.svg';
<span dangerouslySetInnerHTML={{ __html: logo }} />;
```

You can also use SVG when applying background images with CSS. To do this, your SVG's must live under a `bgimages` directory (this directory name is configurable in [rspack.common.js](./rspack.common.js#L5)). This is necessary because you may need to use SVG's in several other context (inline images, fonts, icons, etc.) and so we need to be able to differentiate between these usages so the appropriate loader is invoked.

```css
body {
  background: url(./assets/bgimages/img_avatar.svg);
}
```

## Adding custom CSS

When importing CSS from a third-party package for the first time, you may encounter the error `Module parse failed: Unexpected token... You may need an appropriate loader to handle this file typ...`. You need to register the path to the stylesheet directory in [stylePaths.js](./stylePaths.js). We specify these explicitly for performance reasons to avoid rspack needing to crawl through the entire node_modules directory when parsing CSS modules.

## Code quality tools

- For accessibility compliance, we use [react-axe](https://github.com/dequelabs/react-axe)
- To keep our bundle size in check, we use [@rsdoctor/rspack-plugin](https://github.com/web-infra-dev/rsdoctor)
- To keep our code formatting in check, we use [prettier](https://github.com/prettier/prettier)
- To keep our code logic and test coverage in check, we use [jest](https://github.com/facebook/jest)
- To ensure code styles remain consistent, we use [eslint](https://eslint.org/)

## Multi environment configuration

This project uses [dotenv-webpack](https://www.npmjs.com/package/dotenv-webpack) for exposing environment variables to your code. Either export them at the system level like `export MY_ENV_VAR=http://dev.myendpoint.com && pnpm run start:dev` or simply drop a `.env` file in the root that contains your key-value pairs like below:

```sh
ENV_1=http://1.myendpoint.com
ENV_2=http://2.myendpoint.com
```

With that in place, you can use the values in your code like `console.log(process.env.ENV_1);`
