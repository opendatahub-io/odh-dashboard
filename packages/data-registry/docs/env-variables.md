# Data Registry Environment Variables

The frontend loads `.env`, `.env.development`, and optional `.env.local`
values. The BFF receives its settings from the package Makefile, environment,
or command-line flags.

## Frontend

| Variable | Purpose |
| --- | --- |
| `DEPLOYMENT_MODE` | `standalone` for local mode or `federated` for dashboard integration. |
| `STYLE_THEME` | `mui-theme` for standalone development or `patternfly` for federated development. |
| `PORT` | Frontend development-server port; federated development uses `9103`. |
| `PROXY_HOST`, `PROXY_PORT`, `PROXY_PROTOCOL` | Development proxy target for the BFF; defaults are `localhost`, `4000`, and `http`. |
| `POLL_INTERVAL` | Asset polling interval in milliseconds; defaults to `30000`. |
| `MANDATORY_NAMESPACE` | Optional project value used to constrain the local UI. |

Branding variables such as `PRODUCT_NAME`, `LOGO`, `LOGO_DARK`, `FAVICON`, and
`COMPANY_URI` are also supported. Do not commit credentials or cluster-specific
tokens in `.env.local`.

## BFF

| Variable | Purpose |
| --- | --- |
| `PORT` | BFF listen port; the package uses `4000` for local development. |
| `DEPLOYMENT_MODE` | `standalone` or `federated`. |
| `AUTH_METHOD` | Must be `user_token`. |
| `AUTH_TOKEN_HEADER`, `AUTH_TOKEN_PREFIX` | Identify the caller token. Federated development uses `x-forwarded-access-token` with an empty prefix. |
| `MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT` | Use local Kubernetes and HTTP mocks. |
| `DATA_REGISTRY_API_URL` | Explicit upstream Data Registry API URL; takes precedence over ConfigMap discovery. |
| `DATA_REGISTRY_CONFIGMAP_NAME`, `DATA_REGISTRY_CONFIGMAP_KEY` | ConfigMap discovery settings; defaults are `data-registry-config` and `apiURL`. |
| `STATIC_ASSETS_DIR` | Directory served by the BFF in standalone mode. |
| `INSECURE_SKIP_VERIFY` | Disable upstream TLS verification for local development only. |

If no explicit API URL is configured, the BFF reads the configured URL from a
ConfigMap in its own namespace. If discovery has not completed, registry proxy
requests return `503` until the URL becomes available.
