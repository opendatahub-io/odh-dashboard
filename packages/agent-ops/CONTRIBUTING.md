# Contributing

Agent Ops keeps its frontend in this repository and consumes the OpenShell
Dashboard BFF as an immutable upstream image. BFF behavior changes belong in
the upstream repository; downstream changes should be limited to packaging,
module integration, and artifact updates.

## Development

Install the frontend dependencies, configure an OpenShell gateway, and run the
assembled image with the frontend:

```bash
make dev-install-dependencies
export OPENSHELL_GATEWAY_URL=grpcs://gateway.example.com:443
export GATEWAY_CERT_DIR=/path/to/gateway-certificates # optional
make dev-start-federated
```

The standalone and Kubeflow frontend modes remain available through
`make dev-start` and `make dev-start-kubeflow`. They use the same imported BFF;
there is no downstream mock Go server.

## Updating the BFF artifact

1. Verify the upstream source commit and published image digest.
2. Update `bff/upstream.lock.yaml` and the default image argument in both
   Dockerfiles in the same change.
3. Run the downstream integration checks and build both Dockerfiles.
4. Record any upstream transport, FIPS, or release limitation in the package
   README.

## Verification

```bash
npm run test:contract
make help
```

For a read-only live gateway check, provide the required ROSA environment
variables and run `npm run test:integration:rosa`.

Frontend implementation and testing guidance remains in `frontend/docs/`.
