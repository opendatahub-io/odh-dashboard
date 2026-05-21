[frontend requirements]: ./frontend/docs/dev-setup.md#requirements
[BFF requirements]: ./bff/README.md#pre-requisites
[frontend dev setup]: ./frontend/docs/dev-setup.md#development
[BFF dev setup]: ./bff/README.md#development
[issue]: https://github.com/opendatahub-io/mod-arch-library/issues/new/choose
[contributing guidelines]: https://github.com/opendatahub-io/mod-arch-library/blob/main/CONTRIBUTING.md

# Contributing

Individual bug fixes are welcome. Please open an [issue] to track the fix you are planning to implement. If you are unsure how best to solve it, start by opening the issue and note your desire to contribute.
We have [contributing guidelines] available for you to follow.

## Requirements

To review the requirements, please refer to:

- [Frontend requirements]
- [BFF requirements]

## Set Up

### Development

There are multiple development modes available depending on your needs:

#### Mock Mode (Recommended for Local Development)

Use `make dev-start` to run the application in **mock mode** with mocked Kubernetes client. This is the recommended approach for local development as it:

- Requires no cluster connection
- Uses `user_token` authentication (the default)
- Provides fast feedback loop for UI/BFF development

```bash
make dev-install-dependencies
make dev-start
```

#### Federated Mode (Tapping into a Real Cluster)

Use `make dev-start-federated` when you need to test against a real ODH/RHOAI cluster. This mode:

- Connects to a real Kubernetes cluster (requires port-forwarding)
- Uses `user_token` authentication with `x-forwarded-access-token` header
- Is required for testing real cluster integrations

```bash
# First, set up port-forwarding to your cluster
kubectl port-forward svc/your-service -n your-namespace 8085:8080

# Then start the federated dev environment
make dev-start-federated
```

#### Kubeflow Mode (Kubeflow Central Dashboard)

Use `make dev-start-kubeflow` only if developing for Kubeflow Central Dashboard. This mode:

- Uses `internal` authentication with `kubeflow-userid` header
- Is specific to Kubeflow environments

```bash
make dev-start-kubeflow
```

> **Summary:** Use `dev-start` (mock mode) for most development work. Use `dev-start-federated` when you need to test against a real cluster.

Alternatively, follow the steps in the [frontend dev setup] and [BFF dev setup] guides for manual setup.

### Kubernetes Deployment

For an in-depth guide on how to deploy the Agent Ops UI, please refer to the [local kubernetes deployment](./docs/local-deployment-guide.md) documentation.

To quickly enable the Agent Ops UI in your Kind cluster, you can use the following command:

```shell
make kind-deployment
```

## Debugging and Testing

See [frontend testing guidelines](frontend/docs/testing.md) for testing the frontend.
