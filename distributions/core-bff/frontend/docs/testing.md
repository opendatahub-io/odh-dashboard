# Core BFF UI Testing

## Cypress Tests

Cypress is used to run tests against the frontend while mocking all network requests.

Single command to run all Cypress tests or a specific test (build frontend, start HTTP server, run Cypress):

```bash
pnpm run test:cypress-ci

pnpm run test:cypress-ci -- --spec "**/testfile.cy.ts"
```

Cypress tests require a frontend server to be running.

To best match production, build the frontend and use a lightweight HTTP server to host the files. This method will require manual rebuilds when changes are made to the dashboard frontend code.

```bash
pnpm run cypress:server:build
pnpm run cypress:server
```

To run all Cypress tests or a specific test headless

```bash
pnpm run cypress:run:mock

pnpm run cypress:run:mock -- --spec "**/testfile.cy.ts"
```

To open the Cypress GUI run

```bash
pnpm run cypress:open:mock
```
