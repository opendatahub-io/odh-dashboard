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

To run the federated development environment first make sure you have the latest install in the root and the `maas` package:

From the root of the repo:

```shell
npm i
cd packages/maas
make dev-install-dependencies
```

Then to run the development server if you are properly logged into a cluster:

1. Open a terminal in the root of odh-dashboard

```shell
npm run dev
```

2. Open a second terminal in the `packages/maas` directory

```shell
make dev-start-federated
```

Alternatively to run in mock mode run the following from the `packages/maas` directory

```shell
make dev-start-mock-federated
```

#### `MAAS_API_URL` auto-detection

The `dev-start-federated` (and `dev-bff-federated`) targets need a `MAAS_API_URL` to connect to the MaaS API. If you don't set one, the Makefile will auto-detect it by querying your cluster's ingress domain:

```shell
oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}'
```

The resulting URL is `http://maas.<CLUSTER_DOMAIN>/maas-api`. For this to work you must be logged into the cluster (`oc login`).

You can also set the URL explicitly via environment variable or `.env.local`:

```shell
# environment variable
MAAS_API_URL=http://maas.apps.my-cluster.example.com/maas-api make dev-start-federated

# or in .env.local
MAAS_API_URL=http://maas.apps.my-cluster.example.com/maas-api
```

### Kubernetes Deployment

For an in-depth guide on how to deploy the Mod Arch UI, please refer to the [local kubernetes deployment](./docs/local-deployment-guide.md) documentation.

To quickly enable the Mod Arch UI in your Kind cluster, you can use the following command:

```shell
make kind-deployment
```

## Debugging and Testing

See [frontend testing guidelines](frontend/docs/testing.md) for testing the frontend.
