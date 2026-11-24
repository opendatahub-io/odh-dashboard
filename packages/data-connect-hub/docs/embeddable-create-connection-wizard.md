# Embeddable Connection Wizard

Use the Data Connect Hub (DCH) connection creation wizard from another dashboard package when a feature needs to create a connection without linking to or duplicating the DCH UI. The fallback-aware loader is exported from the DCH package, registers the federated remote, checks availability, and lets the consumer provide an alternate connection UI.

## Prerequisites

- Enable the `dataConnectHub` dashboard feature when the DCH wizard should be used.
- Deploy DCH and make its BFF reachable through `/data-connect-hub`.
- Grant the user permission to create `data-connections` in the target namespace when credential verification or connection creation should be available.
- Add the DCH workspace package to the consumer package.

```json
{
  "dependencies": {
    "@odh-dashboard/data-connect-hub": "workspace:*"
  }
}
```

## Consumer Integration

Import the fallback-aware loader from the DCH package. The consumer does not need to register the DCH Module Federation remote, create a lazy loader, or implement an error boundary for the remote.

```tsx
import React, { useState } from 'react';
import { Button } from '@patternfly/react-core';
import EmbeddableConnectionWizard from '@odh-dashboard/data-connect-hub/EmbeddableConnectionWizard';
import type { DchConnection } from '@odh-dashboard/data-connect-hub/types';

function ConnectionCreator({ namespace }: { namespace: string }) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [connectionId, setConnectionId] = useState<string>();

  return (
    <>
      <Button variant="primary" onClick={() => setIsWizardOpen(true)}>
        Add new connection
      </Button>
      <EmbeddableConnectionWizard
        isOpen={isWizardOpen}
        namespace={namespace}
        connectionTypeProviders={['s3']}
        tearsheetStackLevel={1}
        unavailableFallback={<LegacyConnectionModal namespace={namespace} />}
        onCreated={(connection: DchConnection) => setConnectionId(connection.metadata.id)}
        onClose={() => setIsWizardOpen(false)}
      />
    </>
  );
}
```

The consumer owns the button and open state. DCH owns the wizard steps, BFF calls, notifications, and submission state.

## Availability and Fallbacks

The loader checks availability only while `isOpen` is `true`. It:

1. Checks the `plugin-data-connect-hub` area, including the `dataConnectHub` feature flag.
2. Checks whether the user can create `data-connections` in the supplied namespace.
3. Registers `dataConnectHub` with the consumer's Module Federation runtime and loads `EmbeddableCreateConnectionWizard`.
4. Calls `GET /data-connect-hub/api/v1/backend-health`.
5. Renders the federated wizard only when the feature is enabled, the user has create permission, and both the remote and BFF are available.

The backend-health endpoint calls the upstream DCH REST service's `/health` endpoint. This is separate from `/data-connect-hub/healthcheck`, which is only the DCH BFF liveness endpoint.

If any check fails, the loader renders `unavailableFallback`. This makes it possible to render an existing connection modal or another consumer-specific UI until the future adapter component is available.

Use `onAvailabilityChange` when the consumer needs to track why the fallback was selected:

```ts
type ConnectionWizardAvailability =
  | { status: 'checking' }
  | { status: 'available' }
  | {
      status: 'unavailable';
      reason: 'feature-flag' | 'permissions' | 'remote' | 'backend';
    };
```

The callback receives `{ status: 'checking' }` when the wizard opens, then either `{ status: 'available' }` or an unavailable result with a reason.

## Component Contract

The loader accepts `EmbeddableConnectionWizardProps`. Import the type from `@odh-dashboard/data-connect-hub/types`.

| Prop                           | Type                                                     | Default     | Description                                                                                                                    |
| ------------------------------ | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `isOpen`                       | `boolean`                                                | Required    | Controls wizard visibility and starts availability checks.                                                                     |
| `namespace`                    | `string`                                                 | Required    | Namespace in which the connection is created.                                                                                  |
| `initialConnectionTypeId`      | `string`                                                 | `undefined` | Preselects a connection type and starts at the details step when the type exists.                                              |
| `connectionTypeProviders`      | `string[]`                                               | `undefined` | Restricts the connection-type gallery to these DCH providers, such as `s3`. Provider filtering supersedes the initial type ID. |
| `onCreated`                    | `(connection: DchConnection, namespace: string) => void` | `undefined` | Event callback invoked after the BFF successfully creates a connection.                                                        |
| `onClose`                      | `() => void`                                             | `undefined` | Event callback invoked after a close, cancel, discard, or successful creation.                                                 |
| `isNamespaceSelectable`        | `boolean`                                                | `false`     | Allows the user to select a project instead of displaying the supplied namespace as text.                                      |
| `enableCredentialVerification` | `boolean`                                                | `true`      | Shows credential verification for flight-ready connection types.                                                               |
| `tearsheetStackLevel`          | `number`                                                 | `0`         | Sets the PatternFly tearsheet stacking level. Use a higher level when the wizard renders above another tearsheet.              |
| `unavailableFallback`          | `ReactNode`                                              | Alert       | Rendered when the feature, remote, or backend is unavailable.                                                                  |
| `onAvailabilityChange`         | `(availability: ConnectionWizardAvailability) => void`   | `undefined` | Receives the current wizard availability state.                                                                                |

While availability is checked, the loader renders the connection tearsheet with a loading spinner. This preserves the wizard's presentation before the federated component is available.

### `onCreated`

- Invoked only after DCH successfully creates the connection.
- Receives the created `DchConnection` and the final namespace. The namespace can differ from the `namespace` prop when `isNamespaceSelectable` is enabled.
- Is an event callback, not an async continuation. The wizard does not await a returned value or promise.
- The wizard resets its form, shows its success notification, and calls `onClose` after this callback.
- Use `connection.metadata.id` or `connection.resource` to update consumer state, selections, or caches.

### `onClose`

- Invoked when the user closes, cancels, or discards the wizard.
- Also invoked after successful creation, after `onCreated`.
- Consumers normally set `isOpen` to `false` here.
- The wizard does not invoke it when creation fails; it shows its creation error notification and remains open.

## Embedded Behaviour

- The wizard supplies its own notification provider and toast notifications.
- When `isNamespaceSelectable` is `false`, the namespace renders as plain text rather than a disabled select.
- `connectionTypeProviders` filters the DCH connection-type list before the wizard renders it.
- `connectionTypeProviders` supersedes `initialConnectionTypeId`. If the initial type is filtered out, it is not selected. When exactly one compatible type remains, that type is selected automatically; when multiple compatible types remain, the user selects from the type step.
- If filtering leaves exactly one compatible type, the wizard selects it automatically and starts at the connection details step.
- Credential verification is hidden for connection types that are not flight-ready.
- When enabled, verification is disabled unless the user has permission to create `data-connections` in the selected namespace.
- The wizard does not navigate to DCH pages after creation.

## Local Development

To test a federated consumer against a real local DCH BFF:

```bash
# Terminal 1: dashboard host
pnpm run dev

# Terminal 2: DCH UI and BFF
cd packages/data-connect-hub
make dev-start-federated

# Terminal 3: consuming package
cd packages/my-package
make dev-start-federated
```

The DCH remote entry is served by the dashboard host at `/_mf/dataConnectHub/remoteEntry.js`. If the consumer can load the page but the remote fails to load, verify that the main dashboard and DCH processes are both running and that the DCH feature is enabled.

## Troubleshooting

| Availability result            | Cause and response                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `reason: 'feature-flag'`       | The `dataConnectHub` feature is disabled; render the consumer fallback.                                 |
| `reason: 'permissions'`        | The user cannot create `data-connections` in the supplied namespace; render the consumer fallback.      |
| `reason: 'remote'`             | The DCH remote entry or wizard export could not be loaded; verify both dashboard processes are running. |
| `reason: 'backend'`            | The DCH BFF could not reach the upstream REST service; verify the DCH REST deployment and gateway.      |
| Connection types do not load   | The DCH backend is unavailable, the feature is disabled, or `/data-connect-hub/api` is not reachable.   |
| Verify is disabled             | The user lacks permission to create `data-connections` in the selected namespace.                       |
| No compatible connection types | The `connectionTypeProviders` filter does not match any available DCH provider.                         |
