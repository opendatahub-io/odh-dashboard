# Standalone modules overlay

Kustomize load restrictions require the dev overlay to live in [`modules/kustomization.yaml`](../../modules/kustomization.yaml):

```bash
kustomize build manifests/modular-architecture/modules
```
