# Contributing

Contributing encompasses repository specific requirements.

## Install
Before developing you'll need to install:
* [NodeJS and NPM](https://nodejs.org/)
* [OpenShift CLI](https://docs.openshift.com/enterprise/3.2/cli_reference/get_started_cli.html#installing-the-cli)
* [s2i](https://github.com/openshift/source-to-image)
* and have access to [Quay.io](https://quay.io/)

## Writing code
### Running locally
Development for both "frontend" and "backend" can be done while running
```
$ npm run dev
```

#### Give your dev env access
To give your dev environment access to the ODH configuration, log in to the OpenShift cluster and set the project to the location of the ODH installation
```shell script
$ oc login https://api.my-openshift-cluster.com:6443 -u kubeadmin -p my-password
```
or log in using the makefile and `.env.local` settings
```.env.local
OC_URL=https://specify.in.env:6443
OC_PROJECT=my-project
OC_USER=kubeadmin
OC_PASSWORD=my-password
```

```shell
$ make login
```
or
```
$ npm run make:login
```


## Debugging and Testing
### Basic testing (lint and jest)
  ```
  $ npm run test
  ```

You can apply lint auto-fixes with 
  ```
  $ npm run test:fix
  ```

### Integration checks
To confirm the build output for both backend and frontend
  ```
  $ npm run test:integration
  ```

You can update with
  ```
  $ npm run test:integration-dev
  ```
or
  ```
    $ npm run test:integration-fix
    ```

## Build
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

## Deploy your version
Edit the opendatahub KfDef in your project, remove the section:
```
    - kustomizeConfig:
        repoRef:
          name: manifests
          path: odh-dashboard
      name: odh-dashboard
```

Remove the current deployment of the ODH Dashboard
```shell
$ make undeploy
```
or
```
$ npm run make:undeploy
```

### Customize your env
Customize `.env.local` file to image and source information as desired. `npm` and the `s2i` command line tool is required.

```.env.local
CONTAINER_BUILDER=docker
IMAGE_REPOSITORY=quay.io/my-org/odh-dashboard:latest
SOURCE_REPOSITORY_URL=git@github.com:my-org/odh-dashboard.git
SOURCE_REPOSITORY_REF=my-branch

OC_URL=https://specify.in.env:6443
OC_PROJECT=specify_in_.env

# user and password login
OC_USER=specify_in_.env
OC_PASSWORD=specify_in_.env

# or token login
#OC_TOKEN=specify_in_.env
```

### Build
Push your branch to your repo for it to be visible to the s2i build.

Then build:
```shell
$ make build
```
or
```
$ npm run make:build
```

### Pushing the image
```shell
$ make push
```
or
```
$ npm run make:push
```

### Deploying your image
Required: The OpenShift, `oc`, command line tool is required.

```shell
$ make deploy
```
or
```
$ npm run make:deploy
```
