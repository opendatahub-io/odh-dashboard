# Dev Setup

## Requirements

ODH requires the following to run:

- [NodeJS and NPM](https://nodejs.org/)
  - Node recommended version -> `20.18.0`
  - NPM recommended version -> `10.8.2`
- [OpenShift CLI](https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/cli_tools/openshift-cli-oc)
- [kustomize](https://github.com/kubernetes-sigs/kustomize) (if you need to do deployment)

### Additional tooling

- [Podman](https://github.com/containers/podman) or [Docker](https://www.docker.com/)
  - If using Podman, ensure you have docker compose as well.
- [Quay.io](https://quay.io/)

## Development

### Quick Start

There is a quick start script that will install the required dependencies and run the project in development mode.

> [!WARNING](Container mode currently does not work with Podman)

1. Clone the repository

```bash
git clone https://github.com/opendatahub-io/odh-dashboard
```

2. Run the quick start script

```bash
cd odh-dashboard && make dev-setup
```

```bash
# to add flags
make ARGS="--start-command='cd frontend && npm run start:dev:ext' --skip-env-creation" dev-setup

# to view the help menu
make ARGS="--help" dev-setup
```

- This script will install OpenShift CLI (oc), login to an existing cluster, setup the required operators, install node dependencies, and build the project.
- This will create a .env.local file to hold your choices.
- Some steps require sudo access. You may also skip those steps and install the required tools manually.
- Be default, this will walk you through the setup process everytime. You can choose flags to skip those steps by defining them in the `ARGS` variable.

### Manual Setup

1. Get OpenShift CLI (oc)

2. Setup an OpenShift cluster with [CRC (OpenShift Local)](https://developers.redhat.com/products/openshift-local/overview) or create one in the Red Hat Console.

   - Ensure you have cluster-admin access to the cluster.

3. Login to the OpenShift cluster using the OpenShift CLI (oc)

   ```bash
   oc login <CLUSTER_API_URL> --token=<TOKEN>
   oc login <CLUSTER_API_URL> -u <USERNAME> -p <PASSWORD>

   ```

4. Clone the repository

5. Install the required operators in the OpenShift cluster. You can find these in the OperatorHub or install them manually.

- The ODH Dashboard requires the following operators to be installed for full functionality:
  - [Open Data Hub Operator](https://github.com/opendatahub-io/opendatahub-operator)
  - [Authorino Operator](https://github.com/Kuadrant/authorino-operator)
  - [Red Hat OpenShift Serverless Operator](https://github.com/openshift-knative/serverless-operator)
  - [Red Hat OpenShift Service Mesh 2](https://github.com/Maistra/istio-operator)

6. Within the repo context, we use `npm` to install project dependencies

   ```bash
   cd odh-dashboard && npm install
   ```

### Build project

```bash
npm run build
```

### Serve development content

This is the default context for running a local UI. Make sure you build the project using the instructions above prior to running the command below.

> Note: You must be logged-in with `oc` before you can start the backend. Details for that are in the the [contribution guidelines](../CONTRIBUTING.md#give-your-dev-env-access).

> Note: The CLI logged-in user will need to be a `cluster-admin` level user on the cluster to mimic the Dashboard Service Account level of permissions. You could also bind the [cluster role](../manifests/core-bases/base/cluster-role.yaml) to your user as we do with the service account [binding](../manifests/core-bases/base/cluster-role-binding.yaml).

```bash
npm run start

# For development mode
npm run dev

# For running the backend and frontend separately in development mode
cd frontend && npm run start:dev
cd ../backend && npm run start:dev

# For running the just the frontend in development mode
cd frontend && npm run start:dev:ext
```

> If you'd like to run "backend" and "frontend" separately for development, cd into each directory in two different terminals and run `npm run start:dev` from each.

For in-depth local run guidance review the [contribution guidelines](../CONTRIBUTING.md).

### Testing

Run the tests.

```bash
npm run test
```

For in-depth testing guidance review the [testing guidelines](./testing.md)

### Dev Feature Flags

Feature flags are defined in the [dashboard config](./dashboard-config.md#features). When testing on a live cluster, changing feature flags via the config affects all users on the cluster. It is also possible to personally control the enablement of feature flags within the browser session.

Simply append `?devFeatureFlags` to the dashboard URL.

- A blue banner will appear at the top of the page where a modal can be opened, allowing one to adjust the enablement of feature flags. These settings will persist for the length of the browser session.

With the dev feature flags modal opened, the browser URL will update to include the current feature flag enablement settings. The URL can then be bookmarked or shared.

### Configuring Custom Console Link Domain (CONSOLE_LINK_DOMAIN)

Certain environments require custom access configurations for the OpenShift console and Prometheus endpoints because they may not have access to internal services. To support these configurations, the CONSOLE_LINK_DOMAIN environment variable allows developers to specify a custom domain to override default calculations.

Steps to Configure:

1. Open the root `.env.local` file (or create it if it doesn't exist).
2. Add the following line to define the custom console domain:

   <code>CONSOLE_LINK_DOMAIN=your-custom-domain.com</code>

Replace your-custom-domain.com with the specific domain for your OpenShift console

## Deploying the ODH Dashbard

### Official Image Builds

odh-dashboard images are automatically built and pushed to [quay.io](https://quay.io/repository/opendatahub/odh-dashboard) after every commit to the `main` branch. The image tag name format for each image is `main-<COMMIT SHORT HASH>`.

Example: The `main` branch is updated with commit `f76e3952834f453b1d085e8627f9c17297c2f64c`. The CI system will automatically build an odh-dashboard image based on that code and push the new image to `odh-dashboard:main-f76e395` and updated `odh-dashboard:main` to point to the same image hash.

The [nightly](https://quay.io/opendatahub/odh-dashboard:nightly) tag is a floating tag that is updated nightly and points to the most recent `main-<HASH>` commit from the previous day.

### Deploy using kustomize

The [manifests](../manifests) folder contains a [kustomize](https://kustomize.io) manifest that can be used with `kustomize build`.

### Deploy using a kfdef

> Note: This flow is deprecated, deploy v2 [Operator](https://github.com/opendatahub-io/opendatahub-operator) with their custom CR.

The [manifests/kfdef](../manifests/kfdef) folder contains an example kfdef to deploy ODH Dashboard with the Notebook Controller backend is located in [odh-dashboard-kfnbc-test.yaml](../manifests/kfdef/odh-dashboard-kfnbc-test.yaml).
