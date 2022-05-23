# Open Data Hub Dashboard

A dashboard for Open Data Hub components.

- Shows what's installed
- Show's what's available for installation
- Links to component UIs
- Links to component documentation

## Requirements
Before developing for ODH, the basic requirements:
* Your system needs to be running [NodeJS version 12+ and NPM](https://nodejs.org/)
  
### Additional tooling requirements
* [OpenShift CLI, the "oc" command](https://docs.openshift.com/enterprise/3.2/cli_reference/get_started_cli.html#installing-the-cli)
* [s2i](https://github.com/openshift/source-to-image)
* [Quay.io](https://quay.io/)

## Development
   1. Clone the repository
      ```
      $ git clone https://github.com/red-hat-data-services/odh-dashboard
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

For in-depth local run guidance review the [contribution guidelines](./docs/CONTRIBUTING.md#Serving%20Content)


### Testing
Run the tests.

  ```
  $ npm run test
  ```

For in-depth testing guidance review the [contribution guidelines](./docs/CONTRIBUTING.md#Testing)

## Contributing
Contributing encompasses [repository specific requirements](./docs/CONTRIBUTING.md)

## Documentation

You can find more information about this project in the [document section](./docs/README.md)
