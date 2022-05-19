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

For in-depth local run guidance review the [contribution guidelines](./CONTRIBUTING.md#Serving%20Content)


### Testing
Run the tests.

  ```
  $ npm run test
  ```

For in-depth testing guidance review the [contribution guidelines](./CONTRIBUTING.md#Testing)


### Enabling / Disabling Features
By default the ODH Dashboard comes with a set of core features enabled that are design to work for most scenarios.  There are also advance features that can be enable and disabled by using the odh-dashboard-config map.  The ODH Dashboard will attempt to read features from this config map to enable features that are not enabled by default.  

The following are a list of features that are supported, along with there default settings.

| Feature | Default | Description |
|-------|-------| ------- |
|  enablement| true | Disables the ability to enable addition  applications |
|  disableInfo| false | Removes the information panel in Explore Application section |
|  disableSupport| false | Disables components related to support. |
|  disableClusterManager | false | Disables cluster management section for admins
|  disableTracking | true | Disables telemetry UI data. Note for this feature to work you need woopra and segement.io configured
|  disableBYONImageStream| true | Disables custom notebook images that are created via image streams
|  disableISVBadges | true | Removes the badge that indicate if a product is ISV or not.
|  disableAppLauncher | true | Removes the application launcher that is used in OKD environments

## Contributing
Contributing encompasses [repository specific requirements](./CONTRIBUTING.md)
