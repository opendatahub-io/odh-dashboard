# Data Registry Architecture

## Request Flow

```text
ODH Dashboard
  └─ Data Registry React remote (Module Federation)
       └─ Dashboard proxy / Data Registry Go BFF
            ├─ project and connection lookups through OpenShift APIs
            └─ /api/v1/* passthrough to the upstream Data Registry API
                 └─ registry metadata and referenced storage locations
```

The frontend is a React Module Federation remote. In the dashboard it is
loaded by the `dataRegistry` extension and mounted at
`/ai-hub/data/browse`. The page is currently labelled **Tech Preview**.

The Go BFF provides the authenticated dashboard boundary. It serves local
static assets, resolves visible projects, exposes health and user endpoints,
and forwards Data Registry API requests. The upstream API is the system of
record for registry metadata; the dashboard package does not copy or store
the underlying data.

## Registry Model

```text
RHOAI project (authorization boundary)
└── Collection (organization within the project)
    └── Asset
        ├── structured data: generic table and schema
        └── unstructured data: volume and storage location
```

Assets may reference an RHOAI Data Connection, but the registry stores the
reference rather than connection credentials. Collections organize assets;
they do not create a separate access boundary. Storage access remains the
responsibility of the referenced data system.

## Deployment Modes

- **Federated** — the supported dashboard deployment. The host dashboard
  loads the remote and proxies its BFF requests.
- **Standalone** — local development only. The BFF serves the frontend and
  API routes directly, normally with mocked clients.

The BFF accepts the caller's user token. It uses that identity for its own
OpenShift lookups and forwards the authenticated request to the upstream
registry service, where registry authorization is enforced.
