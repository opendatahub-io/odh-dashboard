# Standalone modules overlay

Each module under [`modules/`](../../modules/) is an independent kustomize package. Deploy one module or all seven:

```bash
# Single module (example: gen-ai)
kustomize build manifests/modular-architecture/modules/gen-ai

# All modules
kustomize build manifests/modular-architecture/modules
```

Set `namespace:` in the module's `kustomization.yaml` (or via a dev overlay) so ClusterRoleBinding subjects reference the target namespace. Kustomize load restrictions require manifests to stay within each module directory; see [`modules/README.md`](../../modules/README.md) for layout and RBAC details.
