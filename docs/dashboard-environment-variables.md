# Dashboard Environment Variables

This document describes environment variables that are injected into the dashboard and modular architecture containers at deploy time. These are set via the manifest `params.env` (and the Operator) and are available to both the main dashboard and Backends-for-Frontend (BFFs).

## GATEWAY_DOMAIN

**Purpose:** The cluster’s gateway/ingress domain. Used when building URLs that depend on the cluster domain (e.g. notebook addresses, gateway-based routes, or any URL that must use the cluster’s canonical domain).

**Manifest parameter:** `gateway-domain` in `params.env` (ODH: `manifests/odh/params.env`, RHOAI: `manifests/rhoai/addon/params.env`, `manifests/rhoai/onprem/params.env`).

**Injected into:**

- Main dashboard container (`odh-dashboard` or `rhods-dashboard`)
- All modular architecture BFF containers:
  - `gen-ai-ui`
  - `model-registry-ui`
  - `maas-ui`

The value is taken from the deployment’s params ConfigMap and applied via Kustomize replacements so the Operator can override it when injecting configuration.

**How to consume:**

- **Node/backend:** `process.env.GATEWAY_DOMAIN`
- **Go BFFs:** Read the `GATEWAY_DOMAIN` environment variable in your application startup or request handlers (e.g. `os.Getenv("GATEWAY_DOMAIN")`).

**Use cases:**

- **Notebook address resolution:** Building correct notebook URLs that use the cluster’s gateway domain.
- **Modular architecture (gen-ai, model-registry, maas):** Any BFF or UI that needs to construct URLs (e.g. for redirects, links, or API targets) based on the cluster domain.
- **Gateway-based routing:** When integrating with the data science gateway or other ingress/gateway resources that rely on the cluster domain.

**Note:** If not set by the Operator, the value is empty. Callers should treat an empty value as “use cluster default or discover at runtime” where applicable (e.g. some BFFs may fall back to querying cluster config when `GATEWAY_DOMAIN` is unset).
