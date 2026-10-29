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

When TLS is enabled (`--cert-file` and `--key-file` both set), the HTTPS listener honors the OpenShift cluster TLS **adherence** policy (`spec.tlsAdherence` on `apiservers.config.openshift.io/cluster`). Under `StrictAllComponents` adherence the listener adopts the cluster TLS security profile (minimum version and cipher suites). Under `LegacyAdheringComponentsOnly` or unset adherence it preserves the backend's historical TLS 1.3 minimum rather than downgrading to a weaker cluster profile. It watches both the profile and the adherence policy and gracefully restarts the listener when either changes, so updates apply without a pod restart. This requires permission to read (`get`/`list`/`watch`) the `apiservers` resource in the `config.openshift.io` API group (granted via the notebooks ClusterRole). Failure handling differs by phase: at **startup**, a *persistent* unreadable policy (denied RBAC, malformed adherence) or an invalid profile under Strict adherence fails closed (the backend exits), while a *transient* read error is lenient — the backend serves its own TLS 1.3 default and relies on the watcher to apply the cluster policy once the API recovers. During a periodic **reload**, any failed or unreadable read (transient, denied, or malformed) **retains the running configuration** and retries, rather than downgrading or restarting the listener.

### API Documentation
For the full list of endpoints, see the [Swagger UI](https://editor.swagger.io?url=https://raw.githubusercontent.com/kubeflow/notebooks/notebooks-v2/workspaces/backend/openapi/swagger.json). 
