# User-based SSAR

## Development Testing

Testing SelfSubjectAccessReviews (SSAR) can be quite annoying sometimes for development environments. Here are a few tips to help with development.

* `cluster-admin`s have all access, you can use those for ease of use of testing all happy paths
* Make sure you consider the permission for each action and understand the corresponding k8s verb
    * Look at stand-alone actions (buttons, etc)
    * Look at Kebab items (eg. duplicate => create; edit => update; etc)
    * Look at in-table actions (eg. toggles; probably patch?)
* Make sure you set up dev-impersonate variables in your `.env` files; specifically `DEV_IMPERSONATE_USER` and `DEV_IMPERSONATE_PASSWORD` (you can read more about impersonate in our [SDK.md](../../../../docs/SDK.md))
    * Using impersonate to get in as an admin without direct access permissions will help test the functionality

### Granting Access to Existing Admin Users

Official release permissions are going to be part of the [operator repo](https://github.com/opendatahub-io/opendatahub-operator/blob/main/controllers/services/auth/resources/README.md). You'll need to submit a PR to grant access to admins on upgrade of the cluster.

However, for development, you'll want to just simply craft a Role and RoleBinding to satisfy k8s on your local cluster.

Note: Be sure to swap out the user target, namespace, and adjust any permissions as needed. Look for the `# <<<<` hints
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dashboard-test-role
  namespace: opendatahub
rules:
  - apiGroups:
      - ''
    resources:                                 # <<<< specify your resource plural
      - pods
    verbs:                                     # <<<< change the verbs as needed
      - create
      - get
      - watch
      - list
      - update
      - patch
      - delete
---
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: dashboard-test-rolebinding
  namespace: opendatahub
subjects:
  - kind: User
    apiGroup: rbac.authorization.k8s.io
    name: adminuser1                           # <<<< specify a different user if needed
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: dashboard-test-role
```
