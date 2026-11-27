# Data Registry Dashboard Documentation

The Dashboard package provides the Data Registry UI and its Go BFF. The registry
API and its metadata store run separately on the cluster.

## Use the Dashboard

Open **AI Hub → Data**, select a project, and browse its collections and
assets. Registration stores metadata and an optional connection reference;
the data stays in its source. Follow the [customer walkthrough](https://github.com/red-hat-data-services/red-hat-ai-examples/tree/main/examples/data-registry)
for asset registration, notebook access, and sharing.

## Develop or Deploy

| Goal                                                  | Start here                                                                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Develop the UI without a cluster                      | [Development setup](dev-setup.md) and [mocked tests](testing.md)                                                                                                        |
| Run the dashboard locally against an existing cluster | [Local dashboard integration](environment-setup.md)                                                                                                                     |
| Enable the backend and dashboard on RHOAI 3.6         | [Cluster configuration walkthrough](https://github.com/red-hat-data-services/red-hat-ai-examples/blob/main/examples/data-registry/01-configure-data-registry/README.md) |

Local integration and cluster deployment both use the federated UI. Standalone
mode is for package development; it does not describe where the backend runs.

## Reference

- [Architecture](architecture.md) — Dashboard, BFF, and registry request flow.
- [Environment variables](env-variables.md) — local UI and BFF configuration.
- [Testing](testing.md) — frontend, BFF, contract, and Cypress checks.
- [Data Registry API guide](https://github.com/opendatahub-io/data-registry/tree/main/docs/user-guide) and [OpenAPI contract](https://github.com/opendatahub-io/data-registry/blob/main/api-contract/data-registry-api.yaml) — direct API use, authentication, authorization, and schemas.
