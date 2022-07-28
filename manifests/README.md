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

##### Installation
Use the `kustomize` tool to process the manifest for the `oc apply` command.

```
# Parse the authentication overlays to deploy ODH Dashboard WITHOUT the required configs for groups
cd manifests/overlays/authentication
kustomize edit set namespace <DESTINATION NAMESPACE>   # Set the namespace in the manifest where you want to deploy the dashboard
kustomize build . | oc apply -f -
```

```
# Deploy ODH Dashboard with authentication AND the default configs for groups and ODHDashboardConfig
cd manifests/overlays/odhdashboardconfig
kustomize edit set namespace <DESTINATION NAMESPACE>   # Set the namespace in the manifest where you want to deploy the dashboard
kustomize build . | oc apply -f -
# You will need to re-run the previous step if you receive the error below
# error: unable to recognize "STDIN": no matches for kind "OdhDashboardConfig" in version "opendatahub.io/v1alpha"
```
