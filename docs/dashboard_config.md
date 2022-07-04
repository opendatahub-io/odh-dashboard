# Dashboard Config

By default the ODH Dashboard comes with a set of core features enabled that are design to work for most scenarios.  The dashboard can be configured from its OdhDashboard CR, `odh-dashboard-config`.

## Features

The following are a list of features that are supported, along with there default settings.

| Feature | Default | Description |
|-------|-------| ------- |
|  enablement| true | Enables the ability to enable ISVs to the dashboard |
|  disableInfo| false | Removes the information panel in Explore Application section |
|  disableSupport| false | Disables components related to support. |
|  disableClusterManager | false | Disables cluster management section for admins
|  disableTracking | false | Disables telemetry UI data. Note for this feature to work you need woopra and segement.io configured
|  disableBYONImageStream| false | Disables custom notebook images that are created via image streams
|  disableISVBadges | false | Removes the badge that indicate if a product is ISV or not.
|  disableAppLauncher | false | Removes the application launcher that is used in OKD environments

## Defaults

In its default state the Dashboard config is in this form:

```yaml
spec:
  dashboardConfig:
    disableBYONImageStream: false
    disableClusterManager: false
    disableISVBadges: false
    disableInfo: false
    disableSupport: false
    disableTracking: false
    disableAppLauncher: false
    enablement: true
```

## Additional fields

The Dashboard config enables adding additional configuration

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
    envVarConfig:
        enabled: true
    gpuConfig:
        enabled: true
    pvcSize: 20Gi
```

### Notebook Controller State

This field (`notebookControllerState`) controls the state of each user of the Notebook controller. This field is managed by the backend of the Dashboard and should not be manually modified. This field is present on the `status` stanza of the OdhDashboardConfig

```yaml
notebookControllerState:
- user: username
  lastSelectedImage: foo:bar
  lastSelectedSize: XSmall
```

## Example OdhDashboard Config

```yaml
apiVersion: opendatahub.io/v1alpha
kind: OdhDashboardConfig
metadata:
  name: odh-dashboard-config
spec:
  dashboardConfig:
    disableBYONImageStream: false
    disableClusterManager: false
    disableISVBadges: false
    disableInfo: false
    disableSupport: false
    disableTracking: false
    disableAppLauncher: false
    enablement: true
  notebookController:
    enabled: false
  notebookSizes:
  - name: Small
    resources:
      requests:
        memory: 1Gi
        cpu: '1'
      limits:
        memory: 2Gi
        cpu: '2'
  - name: Medium
    resources:
      requests:
        memory: 2Gi
        cpu: '2'
      limits:
        memory: 4Gi
        cpu: '4'
  - name: Large
    resources:
      requests:
        memory: 4Gi
        cpu: '4'
      limits:
        memory: 8Gi
        cpu: '8'
status:
  notebookControllerState:
  - user: username
    lastSelectedImage: foo:bar
    lastSelectedSize: XSmall
```
