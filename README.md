# Open Data Hub Dashboard

A dashboard for Open Data Hub components.

- Shows what's installed
- Show's what's available for installation
- Links to component UIs
- Links to component documentation

## Requirements
Before developing for ODH, the basic requirements:
* Your system needs to be running [NodeJS version 14 and NPM](https://nodejs.org/)

### Additional tooling requirements
* [OpenShift CLI, the "oc" command](https://docs.openshift.com/enterprise/3.2/cli_reference/get_started_cli.html#installing-the-cli)
* [podman](https://github.com/containers/podman)
* [Quay.io](https://quay.io/)

## Development
   1. Clone the repository
      ```
      $ git clone https://github.com/opendatahub-io/odh-dashboard
      ```

   1. Within the repo context, install project dependencies
      ```
      $ cd odh-dashboard && npm install
      ```


### Build project
  ```
  $ npm run build
  ```

### Serve development content
This is the default context for running a local UI.  Make sure you build the project using the instructions above prior to running the command below.

  ```
  $ npm run start
  ```

For in-depth local run guidance review the [contribution guidelines](./CONTRIBUTING.md#Serving%20Content)


### Testing
Run the tests.

  ```
  $ npm run test
  ```

For in-depth testing guidance review the [contribution guidelines](./CONTRIBUTING.md#Testing)

## Deploying the ODH Dashbard

### Official Image Builds
odh-dashboard images are automatically built and pushed to [quay.io](https://quay.io/repository/opendatahub/odh-dashboard) after every commit to the `main` branch. The image tag name format for each image is `main-<COMMIT SHORT HASH>`.

Example: The `main` branch is updated with commit `f76e3952834f453b1d085e8627f9c17297c2f64c`.  The CI system will automatically build an odh-dashboard image based on that code and push the new image to `odh-dashboard:main-f76e395` and updated `odh-dashboard:main` to point to the same image hash

The [nightly](https://quay.io/opendatahub/odh-dashboard:nightly) tag is a floating tag that is updated nightly and points to the most recent `main-<HASH>` commit from the previous day.

### Deploy using kustomize
The [manifests](./manifests) folder contains a [kustomize](https://kustomize.io) manifest that can be used with `kustomize build`.

### Deploy using a kfdef
The [manifests/kfdef](./manifests/kfdef) folder contains an example kfdef to deploy ODH Dashboard with the Notebook Controller backend is located in [odh-dashboard-kfnbc-test.yaml](manifests/kfdef/odh-dashboard-kfnbc-test.yaml).

## Contributing
Contributing encompasses [repository specific requirements](./CONTRIBUTING.md)

### Triaging

For information on how we triage tickets, see our [triage.md](./docs/triaging.md).

## Documentation

You can find more information about this project in the [document section](./docs/README.md)

## Releases

For more information on how, when, and what we do for releases, see our [releases.md](./docs/releases.md) 
