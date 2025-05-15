<!-- Deprecated: Move to documenting the CRD -->

# Dashboard Config

By default the ODH Dashboard comes with a set of core features enabled that are designed to work for most scenarios. The dashboard can be configured from its OdhDashboard CR, `odh-dashboard-config`.

## Features

The following are a list of features that are supported, along with their default settings.

| Feature                      | Default | Description                                                                                          |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| enablement                   | true    | Enables the ability to enable ISVs to the dashboard                                                  |
| disableInfo                  | false   | Removes the information panel in Explore Application section                                         |
| disableSupport               | false   | Disables components related to support.                                                              |
| disableClusterManager        | false   | Disables cluster management section for admins                                                       |
| disableTracking              | true    | Disables telemetry UI data. Note for this feature to work you need woopra and segement.io configured |
| disableBYONImageStream       | false   | Disables custom notebook images that are created via image streams                                   |
| disableISVBadges             | false   | Removes the badge that indicate if a product is ISV or not.                                          |
| disableAppLauncher           | false   | Removes the application launcher that is used in OKD environments                                    |
| disableUserManagement        | false   | Removes the User Management panel in Settings.                                                       |
| disableHome                  | false   | Disables Data Science Home page from the dashboard.                                                  |
| disableProjects              | false   | Disables Data Science Projects from the dashboard.                                                   |
| disablePipelines             | false   | Disables Data Science Pipelines from the dashboard.                                                  |
| disableModelServing          | false   | Disables Model Serving from the dashboard and from Data Science Projects.                            |
| disableProjectScoped         | false   | Disables Project Scoped items from Workbenches, hardware profiles and serving runtimes               |
| disableProjectSharing        | false   | Disables Project Sharing from Data Science Projects.                                                 |
| disableCustomServingRuntimes | false   | Disables Custom Serving Runtimes from the Admin Panel.                                               |
| disableKServe                | false   | Disables the ability to select KServe as a Serving Platform.                                         |
| disableKServeAuth            | false   | Disables the ability to use auth in KServe.                                                          |
| disableKServeMetrics         | false   | Disables the ability to see KServe Metrics.                                                          |
| disableKServeRaw             | false   | Disables the option to deploy in raw instead of serverless.                                          |
| disableModelMesh             | false   | Disables the ability to select ModelMesh as a Serving Platform.                                      |
| disableAcceleratorProfiles   | false   | Disables Accelerator profiles from the Admin Panel.                                                  |
| disableHardwareProfiles      | true    | Disables Hardware profiles from the Admin Panel.                                                     |
| disableTrustyBiasMetrics     | false   | Disables Model Bias tab from Model Serving metrics.                                                  |
| disablePerformanceMetrics    | false   | Disables Endpoint Performance tab from Model Serving metrics.                                        |
| disableDistributedWorkloads  | false   | Disables Distributed Workload Metrics from the dashboard.                                            |
| disableModelCatalog          | true    | Disables Model Catalog from the dashboard.                                                           |
| disableModelRegistry         | false   | Disables Model Registry from the dashboard.                                                          |
| disableModelRegistrySecureDB | false   | Disables Model Registry Secure DB from the dashboard.                                                |
| disableServingRuntimeParams  | false   | Disables Serving Runtime params from the dashboard.                                                  |
| disableStorageClasses        | false   | Disables storage classes settings nav item from the dashboard.                                       |
| disableNIMModelServing       | false   | Disables components of NIM Model UI from the dashboard.                                              |
| disableFineTuning            | true    | Disables Fine tuning from the dashboard.                                                             |

## Defaults

In its default state the Dashboard config is in this form:

```yaml
spec:
  dashboardConfig:
    enablement: true
    disableInfo: false
    disableSupport: false
    disableClusterManager: false
    disableTracking: true
    disableBYONImageStream: false
    disableISVBadges: false
    disableAppLauncher: false
    disableUserManagement: false
    disableHome: false
    disableProjects: false
    disablePipelines: false
    disableModelServing: false
    disableProjectSharing: false
    disableCustomServingRuntimes: false
    disableAcceleratorProfiles: false
    disableHardwareProfiles: true
    disableKServeMetrics: false
    disableTrustyBiasMetrics: false
    disablePerformanceMetrics: false
    disableDistributedWorkloads: false
    disableStorageClasses: false
    disableNIMModelServing: false
    disableFineTuning: true
```

## Additional fields

The Dashboard config enables adding additional configuration

### Groups

The `groupsConfig` field controls access to Dashboard features, such as the spawner for allowed users and the cluster settings UI for admins.

```yaml
groupsConfig:
  adminGroups: odh-admins
  allowedGroups: system:authenticated
```

### Sizes

The `notebookSizes` field of the config lists kubernetes style size descriptions. These are added to the dropdown shown when spawning notebooks with the notebook controller.

Note: These sizes must follow conventions such as requests smaller than limits

```yaml
notebookSizes:
  - name: XSmall
    resources:
      requests:
        memory: 0.5Gi
        cpu: '0.1'
      limits:
        memory: 2Gi
        cpu: '0.1'
```

### Notebook controller

The `notebookController` field controls the Notebook Controller options such as whether it is enabled in the dashboard and which parts should be visible.

```yaml
notebookController:
  enabled: true
  pvcSize: 20Gi
  notebookNamespace: odh-notebooks
  notebookTolerationSettings:
    enabled: true
    key: NotebooksOnly
  storageClassName: gp2
```

### Notebook Controller State

We make use of the Notebook resource as a source of truth for what the user has last selected. To that extent, we added new annotations to track the values of the user's last selection. We also rely on two existing kubeflow annotations, `kubeflow-resource-stopped` & `notebooks.kubeflow.org/last-activity`.

New annotations we created are:

| Annotation name                                 | What it represents                                            |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `opendatahub.io/username`                       | The untranslated username behind the notebook`*`              |
| `notebooks.opendatahub.io/last-image-selection` | The last image the user selected (on create notebook)         |
| `notebooks.opendatahub.io/last-size-selection`  | The last notebook size the user selected (on create notebook) |
| `notebooks.opendatahub.io/last-image-version-git-commit-selection` | The last build commit of the image that the user selected

`*` - We need the original user's name (we translate their name to kube safe characters for notebook name and for the label) for some functionality. If this is omitted from the Notebook (or they don't have one yet) we try to make a validation against the current logged in user. This will work most of the time (and we assume logged in user when they don't have a Notebook), if this fails because you're an Admin and we don't have this state, we consider this an invalid state - should be rare though as it requires the subset of users that are Admins to have a bad-state Notebook they are trying to impersonate (to start or view that users Notebook information).

### Serving Runtime Template Order

In order for the user to rearrange their custom Serving Runtime templates, we store the order in the dashboard configuration. When new templates are created they will be added to this list in order

## Example OdhDashboard Config

```yaml
apiVersion: opendatahub.io/v1alpha
kind: OdhDashboardConfig
metadata:
  name: odh-dashboard-config
spec:
  dashboardConfig:
    enablement: true
    disableBYONImageStream: false
    disableClusterManager: false
    disableISVBadges: false
    disableInfo: false
    disableSupport: false
    disableTracking: true
    disableHome: true
    disableProjects: true
    disablePipelines: true
    disableModelServing: true
    disableProjectSharing: true
    disableCustomServingRuntimes: false
    disableAcceleratorProfiles: true
    disableHardwareProfiles: true
    disableKServeMetrics: true
    disableTrustyBiasMetrics: false
    disablePerformanceMetrics: false
    disableNIMModelServing: false
  notebookController:
    enabled: true
    gpuSetting: autodetect
    pvcSize: 20Gi
    notebookNamespace: odh-notebooks
  notebookSizes:
    - name: Small
      resources:
        limits:
          cpu: '2'
          memory: 2Gi
        requests:
          cpu: '1'
          memory: 1Gi
    - name: Medium
      resources:
        limits:
          cpu: '4'
          memory: 4Gi
        requests:
          cpu: '2'
          memory: 2Gi
    - name: Large
      resources:
        limits:
          cpu: '8'
          memory: 8Gi
        requests:
          cpu: '4'
          memory: 4Gi
  modelServerSizes:
    - name: Small
      resources:
        limits:
          cpu: '2'
          memory: 8Gi
        requests:
          cpu: '1'
          memory: 4Gi
    - name: Medium
      resources:
        limits:
          cpu: '8'
          memory: 10Gi
        requests:
          cpu: '4'
          memory: 8Gi
    - name: Large
      resources:
        limits:
          cpu: '10'
          memory: 20Gi
        requests:
          cpu: '6'
          memory: 16Gi
  groupsConfig:
    adminGroups: 'odh-admins'
    allowedGroups: 'system:authenticated'
  templateOrder:
    - 'ovms'
  templateDisablement:
    - 'ovms'
```
