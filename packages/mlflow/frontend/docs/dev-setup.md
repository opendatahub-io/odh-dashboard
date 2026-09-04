# Dev Setup

## Requirements

This project requires the following tools to be installed on your system:

- [Node.js](https://nodejs.org/) `>=22.18.0`
- [pnpm](https://pnpm.io/) `11.22.0` (the repository pins this version in `package.json`)

## Development

1. Clone the repository

      ``` bash
      git clone https://github.com/opendatahub-io/odh-dashboard
      ```

2. Within the repo context, install project dependencies

     ```bash
     cd packages/mlflow/frontend && pnpm install
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

For in-depth local run guidance review the [contribution guidelines](../../../ui/CONTRIBUTING.md).

### Testing

Run the mock tests.

  ```bash
  pnpm run test:cypress-ci
  ```

For in-depth testing guidance review the [testing guidelines](./testing.md)
