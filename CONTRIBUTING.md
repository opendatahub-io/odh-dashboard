# Contributing

Contributing encompasses repository specific requirements.

[dev setup documentation]: docs/dev-setup.md#requirements
[SharedClustersConfluence]: https://spaces.redhat.com/display/RHODS/Dashboard+Shared+Clusters

## Requirements

To review the ODH requirements, please refer to the [dev setup documentation].

## Definition of Ready

Before beginning development on an issue, please refer to our [Definition of Ready](/docs/definition-of-ready.md).

## PR Review Guidelines

When reviewing pull requests, please refer to our comprehensive [PR Review Guidelines](docs/pr-review-guidelines.md) to ensure code quality, functionality, and adherence to best practices.

## Best Practices

For development standards and coding guidelines, please review our [Best Practices](docs/best-practices.md) documentation. This covers React coding standards, component architecture, performance considerations, and PatternFly usage guidelines.

## Writing code

### Running locally

Development for only "frontend" can target a backend service running on an OpenShift cluster. This method requires you to first log in to the OpenShift cluster, see [Give your dev env access](#give-your-dev-env-access). It is recommended to use this method unless backend changes are being developed.

```bash
cd frontend
oc login ...
npm run start:dev:ext
```

Development for both "frontend" and "backend" can be done while running:

```bash
npm run dev
```

But the recommended flow for development would be have two sessions, one for the "frontend":

```bash
cd frontend
npm run start:dev
```

And one for the "backend":

```bash
cd backend
npm run start:dev
```

Once you have either method running, you can open the dashboard locally at: `http://localhost:4010`. The dev server will reload automatically when you make changes.

If running a local backend, some requests from the frontend need to make their way to services running on the cluster for which there are no external routes exposed. This can be achieved using `oc port-forward`. Run the following command in a separate terminal to start the port forwarding processes. Note that this limits developers to working within a single namespace and must be restarted if switching to a new namespace.

```bash
NAMESPACE=my-example make port-forward
```

#### Give your dev env access

This section walks through connecting your local dev environment to an ODH dev cluster.

Your dev env will typically point to either a shared cluster from [SharedClustersConfluence] (where you can also find test user credentials and cluster status) or some other cluster which you/your team created.

##### Pre-requisite Step: Adding a .env.local file

Before you login to a dev cluster, you will want to first ensure you've added a `.env.local` file (not committed) to your repo root (see the `.env.local.example` template file, it explains the variables you can set, some of which you'll want to change). As mentioned in below section [Applied dotenv files](#applied-dotenv-files), there are build processes in place that leverage these .env files.

##### Step 1: Open the cluster console

Open the OpenShift console UI for your target cluster. The console URL should look like: `https://console-openshift-console.apps.{cluster-name}.dev.datahub.redhat.com`

##### Step 2: Login to the cluster

Choose one of the following methods to authenticate:

##### Option A: Using Cluster API Address (Manual)

1. On the cluster UI Overview screen, find the `Cluster API Address` in the Details panel
   - Format: `https://api.{cluster-name}.dev.datahub.redhat.com:6443`
2. Run the login command with your credentials:

   ```bash
   oc login https://api.my-openshift-cluster.com:6443 -u <username> -p <password>
   ```

##### Option B: Copy Login Command (Quick)

1. Click your username dropdown (top right of cluster UI)
2. Select `Copy login command`
3. Enter credentials when prompted
4. Copy and run the displayed `oc login...` command

##### Option C: Using Makefile (Often Fastest)

1. This approach makes use of your `.env.local` file to construct the login command from the variables you've set there (namely `OC_URL`, `OC_USER`/`OC_PASSWORD`, `OC_TOKEN`).
2. Run one of these commands:

   ```bash
   make login
   # OR
   npm run make:login
   ```

##### Important Notes

- ⚠️ **TLS Warning:** You may see a security warning for development clusters behind VPN - this is normal, you can click Accept/Continue
- **Authentication Role:** If given option on login to cluster console UI, use `customadmins` role and not `kube:admin`, which is deprecated
- 🔐 **Daily Re-auth:** You'll need to reauthenticate and restart the backend each day

## Debugging and Testing

See [frontend testing guidelines](docs/testing.md) for more information.

### Unit testing

Jest unit tests cover all utility and hook functions.

```bash
npm run test:unit
```

### End to end testing

Cypress tests using a production instance of the dashboard frontend to test the full application.

```bash
cd ./frontend

# Build and start the server
npm run cypress:server:build
npm run cypress:server

# Run cypress in a separate terminal
npm run cypress:run:mock
```

### Linter testing

```bash
cd ./frontend && npm run test:lint
```

You can apply lint auto-fixes with

```bash
npm run test:fix
```

### CI tests

The CI will run the command `npm run test` which will run tests for both backend and frontend.

## Environment variables

### dotenv files

The current build leverages `dotenv`, or `.env*`, files to apply environment build configuration.

#### Applied dotenv files

dotenv files applied to the root of this project...

- `.env`, basic settings, utilized by both "frontend" and "backend"
- `.env.local`, gitignored settings, utilized by both "frontend" and "backend"
- `.env.development`, utilized by both "frontend" and "backend". Its use can be seen with the NPM script `$ npm run dev`
- `.env.development.local`, utilized by both "frontend" and "backend". Its use can be seen with the NPM script `$ npm run dev`
- `.env.production`, is primarily used by the "frontend", minimally used by the "backend". Its use can be seen with the NPM script `$ npm run start`
- `.env.production.local`, is primarily used by the "frontend", minimally used by the "backend". Its use can be seen with the NPM script `$ npm run start`
- `.env.test`, is primarily used by the "frontend", minimally used by the "backend" during testing
- `.env.test.local`, is primarily used by the "frontend", minimally used by the "backend" during testing

There are build processes in place that leverage the `.env*.local` files, these files are actively applied in our `.gitignore` in order to avoid build conflicts. **They should continue to remain ignored, and not be added to the repository.**

#### Available parameters

The dotenv files have access to default settings grouped by facet; frontend, backend, build

...

## Deploy a new dashboard version in your cluster

For testing purposes, we recommend deploying a new version of the dashboard in your cluster following the steps below.

### Prerequisites

1. Make sure you have the `oc` command line tool installed and configured to access your cluster.
2. Make sure you have the `Open Data Hub Operator` installed in your cluster.
3. Remove the `dashboard` component from your `KfDef` CR if already deployed.
4. You can remove previous dashboard deployments by running `make undeploy` or `npm run make:undeploy`  in the root of this repository.

### Customize your env

We use `IMAGE_REPOSITORY` as the environment variable to specify the image to use for the dashboard. You can set it in the `.env.local` file in the root of this repository.
This environment variable is used in the `Makefile` to build and deploy the dashboard image, and can be set to a new image tag to build or to a pre-built image to deploy.

### Building your image

To deploy a new image, you can either build it locally or use the one built by the CI.

#### Local Build

You can build your image by running

```bash
make build
```

or

```bash
npm run make:build
```

in the root of this repository.

By default, we use [podman](https://podman.io/) as the default container tool, but you can change it by

- setting the `CONTAINER_BUILDER` environment variable to `docker`
- passing it as environment overrides when using `make build -e CONTAINER_BUILDER=docker`

After building the image, you need to push it to a container registry accessible by your cluster. You can do that by running

```bash
make push
```

or

```bash
npm run make:push
```

in the root of this repository.

#### Pull Request Images

All pull requests will have an associated `pr-<PULL REQUEST NUMBER>` image built and pushed to [quay.io](https://quay.io/repository/opendatahub/odh-dashboard) for use in testing and verifying code changes as part of the PR code review.  Any updates to the PR code will automatically trigger a new PR image build, replacing the previous hash that was referenced by `pr-<PULL REQUEST NUMBER>`.

### Deploying your image

To deploy your image, you just need to run the following command in the root of this repository

```bash
make deploy
```

or

```bash
npm run make:deploy
```

you will deploy all the resources located in the `manifests` folder alongside the image you selected in the previous step.

## Definition of Done

Once the elements defined in the [Definition of Done](/docs/definition-of-done.md) are complete, the feature, bug or story being developed will be considered ready for release.
