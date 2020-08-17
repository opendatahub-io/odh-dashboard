
![Image](https://github.com/PARTHSONI95/odh-dashboard/blob/master/frontend/public/images/redHat-icon.png "icon") Open Data Hub Dashboard
=======================

It's a User interface that queries available Open Data Hub services and provides links and descriptions to each service.

## Technology Used:

Front-view is handled using [React.js](https://reactjs.org/docs/getting-started.html) which is bootstrapped with the help of [Patternfly](https://www.patternfly.org/v4/). And [Node.js](https://nodejs.org/en/) is used at the server level including web framework [Fastify](https://www.fastify.io/).

## Usage
Customize your `.env` file similar to `.env.example`(.env.example)

#### Development
Optionally customize `.env` file to change ports as desired
```.env
FRONTEND_DEV_PORT=3000
BACKEND_DEV_PORT=8080
```

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

#### Deploying
Customize `.env` file for deployment information.  Required.  `oc` command line tool is required.
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

```shell script
$ make deploy
```