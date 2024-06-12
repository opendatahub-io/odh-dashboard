# Manifests

The Dashboard manifests run on Kustomize. There are 3 types of deployments for the Dashboard component.

- Open Data Hub (`./odh`)
- Red Hat OpenShift AI
  - RHOAI Managed (`./rhoai/addon`)
  - RHOAI Self Managed (`./rhoai/onprem`)

## Adding new Manifests

Starting at the deployment type folders (see above) there will be a `kustomization.yaml` file -- consider this an "index file". Each reference in these "index files" reference other "index files" in other folders until they reach a folder that contains specific manifest yamls. Maintain this structure for cleanness.

The operator will start from one of the deployment type folders, so we are in control of all the references from there. Keep sane references & be sure to read the README files in each of the root folders for guidelines.

## Installation

Use the `kustomize` tool to process the manifest for the `oc apply` command.

```
# Parse the base manifest to deploy ODH Dashboard WITHOUT the required configs for groups
cd manifests/common/base
# Set the namespace in the manifest where you want to deploy the dashboard
kustomize edit set namespace <DESTINATION NAMESPACE>
kustomize build . | oc apply -f -
```
