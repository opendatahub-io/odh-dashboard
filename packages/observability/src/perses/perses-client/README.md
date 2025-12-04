# Perses Client Files

These files are based on code from the [OpenShift monitoring-plugin](https://github.com/openshift/monitoring-plugin/tree/main/web/src/components/dashboards/perses/perses)
which in turn originated from [Perses](https://github.com/perses/perses/tree/main/ui/app/src/model).

The Perses npm packages (`@perses-dev/core`, `@perses-dev/dashboards`, etc.) export UI components
and types, but the API client code for fetching dashboards and datasources from a Perses server
is internal to the Perses UI application.

## Why is this needed?

When embedding Perses in another application, you need to:
1. Proxy API requests through your own backend (for auth, CORS, etc.)
2. Build URLs that point to your proxy instead of directly to Perses
3. Fetch dashboard and datasource configurations from the Perses server

The [Perses embedding documentation](https://perses.dev/perses/docs/embedding-panels/) shows
how to embed panels with static/hardcoded datasources, but if you need to dynamically fetch
configurations from a Perses server, you need this client code.

## Changes from upstream monitoring-plugin

### Modified files

- **`url-builder.ts`**: Changed `basePath` from `/api/proxy/plugin/monitoring-console-plugin/perses` to `/perses/api`
- **`datasource-client.ts`**: Uses `odhPersesFetchJson` instead of upstream fetch utilities
- **`global-datasource-client.ts`**: Uses `odhPersesFetchJson` instead of upstream fetch utilities
- **`perses-client.ts`**: Complete rewrite for ODH - provides dashboard fetching functions with ODH proxy paths

### Modified classes

- **`Cache` class** (`datasource-api.ts`): Replaced `lru-cache` npm package with a custom `Map`-based implementation to reduce dependencies while maintaining 5-minute TTL caching
- **`CachedDatasourceAPI` class** (`datasource-api.ts`): Removed `addCsrfToken` function and OpenShift Console SDK (`getCSRFToken`) dependency since ODH doesn't run inside OpenShift Console

### Added for ODH

- **`OdhDatasourceApi` class** (`datasource-api.ts`): New implementation of `DatasourceApi` interface from `@perses-dev/dashboards`. The upstream monitoring-plugin doesn't export a concrete datasource API implementation - it relies on the OpenShift Console ecosystem. ODH needs this to:
  - Build proxy URLs for datasource queries (`/perses/api/proxy/...`)
  - Fetch datasources and global datasources through the ODH backend proxy
- **`odhPersesFetchJson` function** (`perses-client.ts`): Wrapper around Perses `fetchJson` for ODH-specific fetch handling
- **`fetchProjectDashboards` function** (`perses-client.ts`): Helper to fetch all dashboards for a specific project

## Future

Once Perses exposes these methods in their npm packages, we can remove this directory
and import directly from Perses.
