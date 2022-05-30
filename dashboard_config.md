# Dashboard Config

The dashboard can be configured from its OdhDashboard CR, `odh-dashboard-config`.

## Defaults

In its default state the Dashboard config is in this form:

```
spec:
  dashboardConfig:
    disableBYONImageStream: false
    disableClusterManager: false
    disableISVBadges: false
    disableInfo: false
    disableSupport: false
    disableTracking: false
    enablement: true
```

## Additional fields

The Dashboard config enables adding additional configuration

### Sizes

The `notebookSizes` field of the config lists kubernetes style size descriptions. These are added to the dropdown shown when spawning notebooks with the notebook controller.

Note: These sizes must follow conventions such as requests smaller than limits
```
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

```
notebookController:
    enabled: true
    envVarConfig:
        enabled: true
    gpuConfig:
        enabled: true
```

### Notebook Controller State

This field (`notebookControllerState`) controls the state of each user of the Notebook controller. This field is managed by the backend of the Dashboard and should not be manually modified.

```
notebookControllerState:
- user: username
    environmentVariables:
    - key: foo
        value: bar
    lastSelectedImage: foo:bar
    lastSelectedSize: XSmall
    secrets: odh-secrets-username
```

## Example OdhDashboard Config
```
apiVersion: core.opendatahub.io/v1alpha
kind: OdhDashboard
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
```


