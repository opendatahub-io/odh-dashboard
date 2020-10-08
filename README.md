Open Data Hub Dashboard
=======================

A dashboard for Open Data Hub components.

- Shows what's installed
- Show's what's available for installation
- Links to component UIs
- Links to component documentation


#### Open Data Hub Operator Deployment
Add the dashboard component and the repo to the ODH instance kfdef yaml.  
```yaml
apiVersion: kfdef.apps.kubeflow.org/v1
kind: KfDef
spec:
  applications:
    # ... other components ...

    # Add Dashboard Component
    - kustomizeConfig:
        repoRef:
          name: odh-dashboard
          path: install/odh/base
      name: odh-dashboard
  repos:
    # ... other repos ...

    # Add Dashboard Dev Repo 
    - name: odh-dashboard
      uri: 'https://github.com/opendatahub-io/odh-dashboard/tarball/master'

  version: vX.Y.Z
```

## Development
Customize your `.env` file similar to `.env.example`(.env.example)

#### Running Locally
Optionally customize `.env` file to change ports as desired
```.env
FRONTEND_DEV_PORT=3000
BACKEND_DEV_PORT=8080
```

To give your dev environment access to the ODH configuration, log in to the OpenShift cluster and set the project to the location of the ODH installation
```shell script
$ oc login https://api.my-openshift-cluster.com:6443 -u kubeadmin -p my-password
```
or log in using the makefile and `.env` settings
```.env
OC_URL=https://specify.in.env:6443
OC_PROJECT=opendatahub
OC_USER=kubeadmin
OC_PASSWORD=my-password
```
```shell script
$ make login
```

To run the development servers, you can run them both concurrently:
```shell script
$ make dev
```

Or the front end and server separately:

In terminal 1:
```shell script
$ make dev-backend
```
In terminal 2:
```shell script
$ make dev-frontend
```

#### Building
Customize `.env` file to image and source information as desired. `npm` and the `s2i` command line tool is required.  [https://github.com/openshift/source-to-image](https://github.com/openshift/source-to-image)
```.env
IMAGE_REPOSITORY=quay.io/my-org/odh-dashboard:latest
SOURCE_REPOSITORY_URL=git@github.com:my-org/odh-dashboard.git
SOURCE_REPOSITORY_REF=my-branch
```
```shell script
$ make build
```

#### Pushing the image
Customize `.env` file to image information and container builder.
```.env
CONTAINER_BUILDER=docker
IMAGE_REPOSITORY=quay.io/my-org/odh-dashboard:latest
```
```shell script
$ make push
```

#### Deploying your image
Customize `.env` file for deployment information.  Required.  `oc` command line tool is required.

First set the image to deploy to your custom image you've built in previous steps.
```.env
IMAGE_REPOSITORY=quay.io/my-org/odh-dashboard:latest
```

Then set your login information to deploy to your cluster.
```.env
OC_URL=https://specify.in.env:6443
OC_PROJECT=specify_in_.env
# user and password login
#OC_USER=specify_in_.env
#OC_PASSWORD=specify_in_.env
```
or
```.env
OC_URL=https://specify.in.env:6443
OC_PROJECT=specify_in_.env
# token login
OC_TOKEN=specify_in_.env
```

Now execute the deployment scripts.
```shell script
$ make deploy
```