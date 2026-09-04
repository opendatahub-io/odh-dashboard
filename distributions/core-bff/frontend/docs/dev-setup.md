# Dev Setup

## Requirements

This project requires the following tools to be installed on your system:

- [Node.js](https://nodejs.org/) `>=22.18.0`
- [pnpm](https://pnpm.io/) `11.22.0` (pinned in the repository root)

## Development

1. Clone the repository

      ``` bash
      git clone https://github.com/opendatahub-io/odh-dashboard
      ```

2. Install dependencies from the repository root, then switch to this frontend

     ```bash
     cd odh-dashboard
     pnpm install
     cd distributions/core-bff/frontend
     ```

### Build project

```bash
pnpm run build
```

### Serve development content

This is the default context for running a local UI.  Make sure you build the project using the instructions above prior to running the command below.

```bash
pnpm run start:dev
```

For in-depth local run guidance review the [contribution guidelines](../../CONTRIBUTING.md).

### Testing

Run the mock tests.

  ```bash
  pnpm run test:cypress-ci
  ```

For in-depth testing guidance review the [testing guidelines](./testing.md)
