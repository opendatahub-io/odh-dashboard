[dev setup documentation]: docs/dev-setup.md#requirements

# Contributing

Contributing encompasses repository specific requirements.

## Requirements

To review the ODH requirements, please refer to the [dev setup documentation].

## Writing code

### Running locally

Development for both "frontend" and "backend" can be done while running:

``` bash
npm run dev
```

But the recommended flow for development would be have two sessions, one for the frontend:

```bash
cd frontend
npm run start:dev
```

And one for the backend

```bash
cd backend
npm run start:dev
```

Once you have these running, you can open the dashboard locally at: `http://localhost:4010`. The dev server will reload automatically when you make changes.

#### Give your dev env access

To give your dev environment access to the ODH configuration, log in to the OpenShift cluster and set the project to the location of the ODH installation

```bash
oc login https://api.my-openshift-cluster.com:6443 -u <username> -p <password>
```

or log in using the makefile and `.env.local` settings

```.env.local
OC_URL=https://specify.in.env:6443
OC_PROJECT=my-project
OC_USER=kubeadmin
OC_PASSWORD=my-password
```

```bash
make login
```

or

```bash
npm run make:login
```

> Note: You'll need to reauthenticate using one of the above steps and restart `backend` each day.

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
