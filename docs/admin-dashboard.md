# Settings Panel

The Dashboard now has a new *admin panel* to control several features such as *user interaction tracking*, *bring your own notebook creation*, *PVC size configuration* and more.

To enable this section, there are several config file that must be present in our cluster, the main goal is to add our username to the **admin group we are using as an odh-admin list group**. ODH-Dashboard infers this username from our OpenShift user.
## Enable Settings Panel

The current flow to determine which group is the odh-admin group is the following:

1. Inside the CRD `odh-dashboard-config`, we have an attribute called `groupsConfig`. The attribute `adminGroups` will store all **OpenShift Groups** added as admins.

```yaml
apiVersion: opendatahub.io/v1alpha
kind: OdhDashboardConfig
metadata:
  creationTimestamp: null
  name: odh-dashboard-config
spec:
  ...
  groupsConfig:
    adminGroups: 'odh-admins'
    allowedGroups: 'system:authenticated'

```

2. Apart from that, we should have one or several `Groups` with the same name as the one mentioned above, here we should have all of our **admin users**.

```yaml
apiVersion: user.openshift.io/v1
kind: Group
metadata:
    name: odh-admins
users:
    - johndoe
```
