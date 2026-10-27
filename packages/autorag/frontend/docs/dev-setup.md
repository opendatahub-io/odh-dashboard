# Dev Setup

## Requirements

This project requires the following tools to be installed on your system:

- [Node.js](https://nodejs.org/) `>=22.18.0`
- [pnpm](https://pnpm.io/) `11.22.0` (pinned in the repository root)

## Development

1. Clone the repository

   ```bash
   git clone https://github.com/opendatahub-io/odh-dashboard
   ```

2. Install dependencies from the repository root, then switch to this frontend

   ```bash
   cd odh-dashboard
   pnpm install
   cd packages/autorag/frontend
   ```

### Build project

```bash
pnpm run build
```

### Serve development content

This is the default context for running a local UI. Make sure you build the project using the instructions above prior to running the command below.

```bash
pnpm run start:dev
```

The **Try this pattern** drawer uses the Gen AI frontend's federated playground and its
BFF Responses relay. To use the drawer in standalone development, start the Gen AI
frontend in federated mode on port 9102:

```bash
cd packages/gen-ai/frontend
DEPLOYMENT_MODE=federated PORT=9102 pnpm run start:dev
```

Set `GEN_AI_REMOTE_PORT` when starting AutoRAG if the Gen AI frontend uses another port.
The Gen AI BFF must also be running on port `8080` (or configured with
`GEN_AI_BFF_PROTOCOL`, `GEN_AI_BFF_HOST`, and `GEN_AI_BFF_PORT`) and configured with
`GATEWAY_DOMAIN` so its relay can reach the AutoRAG Responses endpoint. The drawer does
not require an OGX playground connection.

The relay requires a bearer user token, so start both the Gen AI BFF and the AutoRAG dev
server with `user_token` auth. A Gen AI BFF started with `AUTH_METHOD=disabled` (or
`internal`) skips identity injection and every playground question fails with
`[unknown] missing authentication identity`.

```bash
# Gen AI BFF (GATEWAY_DOMAIN accepts a full URL for a fully local stack;
# a bare host defaults to https://<host>)
cd packages/gen-ai/bff
AUTH_METHOD=user_token AUTH_TOKEN_HEADER=x-forwarded-access-token \
  GATEWAY_DOMAIN=http://localhost:4001 make run PORT=8080

# AutoRAG frontend (forwards the oc/kubectl token, or KUBE_TOKEN, to /gen-ai/api)
cd packages/autorag/frontend
AUTH_METHOD=user_token pnpm run start:dev
```

Pointing `GATEWAY_DOMAIN` at `http://localhost:4001` sends the playground's relayed
requests to the local AutoRAG BFF, so local BFF changes (for example Neo4j support) are
exercised without redeploying the cluster module.

For in-depth local run guidance review the [contribution guidelines](../../CONTRIBUTING.md).

### Testing

Run the mock tests.

```bash
pnpm run test:cypress-ci
```

For in-depth testing guidance review the [testing guidelines](./testing.md)
