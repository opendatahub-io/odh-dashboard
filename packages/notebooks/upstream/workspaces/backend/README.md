# Kubeflow Workspaces Backend
The Kubeflow Workspaces Backend is the _backend for frontend_ (BFF) used by the Kubeflow Workspaces Frontend as part of [Kubeflow Notebooks 2.0](https://github.com/kubeflow/kubeflow/issues/7156).

> ⚠️ __Warning__ ⚠️
>
> The Kubeflow Workspaces Backend is a work in progress and is __NOT__ currently ready for use.
> We greatly appreciate any contributions.

# Building and Deploying

TBD

# Development

Run the following command to build the BFF:

```shell
make build
```

After building it, you can run our app with:

```shell
make run
```

If you want to use a different port:

```shell
make run PORT=8000
```

### TLS

When TLS is enabled (`--cert-file` and `--key-file` both set), the HTTPS listener honors the OpenShift cluster TLS **adherence** policy (`spec.tlsAdherence` on `apiservers.config.openshift.io/cluster`). Under `StrictAllComponents` adherence the listener adopts the cluster TLS security profile (minimum version and cipher suites). Under `LegacyAdheringComponentsOnly` or unset adherence it preserves the backend's historical TLS 1.3 minimum rather than downgrading to a weaker cluster profile. It watches both the profile and the adherence policy and gracefully restarts the listener when either changes, so updates apply without a pod restart. This requires permission to read (`get`/`list`/`watch`) the `apiservers` resource in the `config.openshift.io` API group (granted via the notebooks ClusterRole). If the policy cannot be authoritatively read (denied/transient read or a malformed profile) the listener fails closed rather than serve an unverified configuration. This applies at **startup** (the backend exits if the policy cannot be read or, under Strict adherence, is invalid); during a periodic **reload** a failed or unreadable read instead **retains the running configuration** and retries, rather than restarting the listener.

### API Documentation
For the full list of endpoints, see the [Swagger UI](https://editor.swagger.io?url=https://raw.githubusercontent.com/kubeflow/notebooks/notebooks-v2/workspaces/backend/openapi/swagger.json). 
