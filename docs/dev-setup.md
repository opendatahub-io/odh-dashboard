# Dev Setup

## Requirements

ODH requires the following to run:

- [NodeJS and NPM](https://nodejs.org/)
  - Node recommended version -> `18.16.0`
  - NPM recommended version -> `9.6.7`
- [OpenShift CLI](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)
- [kustomize](https://github.com/kubernetes-sigs/kustomize) (if you need to do deployment)

### Additional tooling

- [Podman](https://github.com/containers/podman)
- [Quay.io](https://quay.io/)

## Development

1. Clone the repository
      ``` bash
      git clone https://github.com/opendatahub-io/odh-dashboard
      ```
2. Within the repo context, install project dependencies
     ```bash
     cd odh-dashboard && npm install
     ```

### Build project

```bash
npm run build
```

### Serve development content

This is the default context for running a local UI.  Make sure you build the project using the instructions above prior to running the command below.

> Note: You must be logged-in with `oc` before you can start the backend. Details for that are in the the [contribution guidelines](../CONTRIBUTING.md#give-your-dev-env-access).

> Note: The CLI logged-in user will need to be a `cluster-admin` level user on the cluster to mimic the Dashboard Service Account level of permissions. You could also bind the [cluster role](../manifests/core-bases/base/cluster-role.yaml) to your user as we do with the service account [binding](../manifests/core-bases/base/cluster-role-binding.yaml).

```bash
npm run start
```

> If you'd like to run "backend" and "frontend" separately for development, cd into each directory in two different terminals and run `npm run start:dev` from each.

For in-depth local run guidance review the [contribution guidelines](../CONTRIBUTING.md).

### Testing

Run the tests.

  ```bash
  npm run test
  ```

For in-depth testing guidance review the [testing guidelines](./testing.md)

## Deploying the ODH Dashbard

### Official Image Builds

odh-dashboard images are automatically built and pushed to [quay.io](https://quay.io/repository/opendatahub/odh-dashboard) after every commit to the `main` branch. The image tag name format for each image is `main-<COMMIT SHORT HASH>`.

Example: The `main` branch is updated with commit `f76e3952834f453b1d085e8627f9c17297c2f64c`.  The CI system will automatically build an odh-dashboard image based on that code and push the new image to `odh-dashboard:main-f76e395` and updated `odh-dashboard:main` to point to the same image hash.

The [nightly](https://quay.io/opendatahub/odh-dashboard:nightly) tag is a floating tag that is updated nightly and points to the most recent `main-<HASH>` commit from the previous day.

### Deploy using kustomize

The [manifests](./manifests) folder contains a [kustomize](https://kustomize.io) manifest that can be used with `kustomize build`.

### Deploy using a kfdef

> Note: This flow is deprecated, deploy v2 [Operator](https://github.com/opendatahub-io/opendatahub-operator) with their custom CR.

The [manifests/kfdef](./manifests/kfdef) folder contains an example kfdef to deploy ODH Dashboard with the Notebook Controller backend is located in [odh-dashboard-kfnbc-test.yaml](manifests/kfdef/odh-dashboard-kfnbc-test.yaml).
