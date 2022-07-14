# Dashboard

The Open Data Hub Dashboard component installs a UI which 

- Shows what's installed
- Show's what's available for installation
- Links to component UIs
- Links to component documentation

For more information, visit the project [GitHub repo](https://github.com/opendatahub-io/odh-dashboard).

### Folders
1. base: contains all the necessary yaml files to install the dashboard
2. overlays/authentication: Contains the necessary yaml files to install the
   Open Data Hub Dashboard configured to require users to authenticate to the
   OpenShift cluster before they can access the service

##### Installation with KFDef
You can deploy the dashboard using the [odh-dashboard-kfnbc-test.yaml](odh-dashboard-kfnbc-test.yaml)
```
  - kustomizeConfig:
      repoRef:
        name: manifests
        path: odh-dashboard
    name: odh-dashboard
```

If you would like to configure the dashboard to require authentication:
```
  - kustomizeConfig:
      overlays:
        - authentication
      repoRef:
        name: manifests
        path: odh-dashboard
    name: odh-dashboard
```

If you would like to deploy the default configs for the Dashboard groups and `ODHDashboardConfig` you can enable the `odhdashboardconfig` overlay.
NOTE: If you deploy this with the odh-operator, you will need to allow the operator to deploy the initial version of the files and then remove the `odhdashboardconfig` from the overlay to prevent the operator from reseting any changes made to the groups or config
```
  - kustomizeConfig:
      overlays:
        - authentication
        - odhdashboardconfig
      repoRef:
        name: manifests
        path: odh-dashboard
    name: odh-dashboard
```
