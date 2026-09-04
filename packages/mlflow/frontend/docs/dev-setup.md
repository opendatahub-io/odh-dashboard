# Dev Setup

## Requirements

This project requires the following tools to be installed on your system:

- [Node.js and pnpm](https://nodejs.org/)
  - Node recommended version -> `22.17.0`
  - pnpm version -> `10.8.2`

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
