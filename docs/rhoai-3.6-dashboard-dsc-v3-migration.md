# Dashboard Configuration Changes for RHOAI 3.6

RHOAI 3.6 introduces the Dashboard portion of the DataScienceCluster (DSC) v3
configuration. The Dashboard component now has independent management states
for the standard Dashboard and the MaaS Portal.

## DSC v3 Configuration

Configure Dashboard operands under `spec.components.dashboard`:

```yaml
spec:
  components:
    dashboard:
      standard:
        managementState: Managed
      maasPortal:
        managementState: Removed
```

The two child components are independent. Setting `standard` to `Removed` does
not remove a managed `maasPortal`, and setting `maasPortal` to `Removed` does
not remove the standard Dashboard.

`managementState` accepts `Managed` or `Removed` for each child. The MaaS Portal
also requires the Dashboard gateway domain when it is managed.

**Platform support:** The MaaS Portal is supported only on RHOAI Self-Managed
and RHOAI Managed. On other platforms, `managementState: Managed` reports an
`UnsupportedPlatform` condition and does not deploy MaaS Portal resources.

## Migration From DSC v2

When migrating an existing DSC v2 configuration, use these field mappings:

| DSC v2 | DSC v3 |
| --- | --- |
| `spec.components.dashboard.managementState` | `spec.components.dashboard.standard.managementState` |
| `spec.components.dashboard.maasConsumerPortal.managementState` | `spec.components.dashboard.maasPortal.managementState` |

The v2 `maasConsumerPortal` name is retained for conversion and compatibility.
New DSC v3 configuration should use `maasPortal`.

## Upgrade Guidance

Before upgrading to RHOAI 3.6:

- Review the current values of both Dashboard management states.
- Decide independently whether the standard Dashboard and MaaS Portal should be
  managed after the upgrade.
- If the MaaS Portal is managed, verify that the Dashboard gateway domain is
  configured.

After upgrading:

- Confirm that `spec.components.dashboard.standard.managementState` and
  `spec.components.dashboard.maasPortal.managementState` contain the intended
  values.
- Confirm that the Dashboard and MaaS Portal resources match their respective
  management states.
- Keep using the v2 field names only for v2 clients or compatibility workflows;
  do not add the legacy name to new v3 configuration.

The v2-to-v3 conversion preserves the independent Dashboard and MaaS Portal
states. Existing v2 configurations therefore do not need to be rewritten before
the upgrade solely because of the field rename.

## Compatibility Note

The Dashboard custom resource accepts both `maasPortal` and the legacy
`maasConsumerPortal` spelling for compatibility with existing resources. When
both are present on a Dashboard custom resource, `maasPortal` takes precedence.

This compatibility behavior is separate from the DSC-to-Dashboard projection:
the ODH Operator reads the DSC and creates the Dashboard custom resource. Verify
the deployed ODH Operator and Dashboard revisions together before relying on a
specific projected field name in an environment.

Internal Dashboard module and metadata names are not part of this 3.6 migration
guidance.
