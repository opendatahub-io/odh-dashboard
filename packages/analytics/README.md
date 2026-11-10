# @odh-dashboard/analytics

Shared Segment analytics implementation for ODH Dashboard.

## Purpose

Provides shared tracking contracts and the concrete Segment implementation for host applications. Feature packages describe events; the host decides how those events are delivered.

## Design

```mermaid
flowchart LR
  Component[React component] --> Hook[useTrackEvent]
  Hook --> Adapter[Host-provided tracking adapter]
  Helper[Pure helper or service] -->|Injected callback| Adapter
  Adapter --> Implementation[Analytics implementation]
```

The host mounts `HostApiCoreContext` with a `trackEvent` callback. React components and custom hooks obtain that callback through `useTrackEvent()` from `@odh-dashboard/plugin-core/host-api`. Pure helpers and services receive it as an argument, so they can fire events without calling React hooks.

Custom events use one operation: `trackEvent(name, properties)`. Keep event names, privacy-reviewed payload types, and event builders in the feature that owns them.

### Ownership

| Layer                    | Responsibility                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature                  | Define event names and properties, choose when to emit events, and pass tracking callbacks into pure helpers.                                     |
| Host / distribution      | Supply the callback, apply consent and enablement policy, initialize the SDK, bind environment metadata, and own page tracking and user identity. |
| Analytics implementation | Integrate with the Segment SDK, deliver custom/page/identity events, and provide anonymous user ID hashing.                                       |

Each distribution supplies a concrete adapter or an explicit intentional no-op. Mount the provider for every supported application entry point; do not rely on an unmounted context to disable tracking.

Page and identity operations belong to the host lifecycle. Keep them separate from feature custom events to preserve routing, identity, and event-count semantics.

### Import Boundaries

- `@odh-dashboard/analytics`: implementation functions for host integration.
- `@odh-dashboard/analytics/types`: SDK-free shared contracts, including `TrackingOutcome` and property types. This entry point imports neither React nor Segment.
- `@odh-dashboard/plugin-core/host-api`: the injected tracking contract and `useTrackEvent()` hook for features.

Feature code imports only the contracts entry point from this package. It does not import the implementation, import the Segment SDK, or access analytics globals. The `@odh-dashboard/no-direct-analytics` lint rule enforces this boundary in guarded feature files.

## Usage

### Feature Helpers

```ts
import type { HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';

type TrackEvent = HostApiCoreServices['trackEvent'];

export const fireModelDeleted = (trackEvent: TrackEvent, outcome: TrackingOutcome): void => {
  trackEvent('Model Deleted', { outcome, type: 'single' });
};
```

A React caller obtains `trackEvent` with `useTrackEvent()` and passes it to the helper from its event handler. Non-React callers receive the same callback through their arguments or constructor. Keep callback ownership explicit rather than storing a global tracking function.

### Host Integration

Bind runtime cluster ID, development mode, and app version in the host adapter supplied to `HostApiCoreContext.trackEvent`. A host-owned configuration getter returns the current policy and metadata on every call, including calls from long-running work that retained an earlier callback.

```tsx
import React from 'react';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { fireTrackingEvent } from '@odh-dashboard/analytics';

type TrackingConfig = {
  enabled: boolean;
  clusterID: string;
  devMode: boolean;
  version: string;
};

type HostTrackingProviderProps = React.PropsWithChildren<{
  services: Omit<HostApiCoreServices, 'trackEvent'>;
  getTrackingConfig: () => TrackingConfig;
}>;

function HostTrackingProvider({
  services,
  getTrackingConfig,
  children,
}: HostTrackingProviderProps) {
  const trackEvent = React.useMemo<HostApiCoreServices['trackEvent']>(
    () => (name, properties) => {
      const { enabled, ...metadata } = getTrackingConfig();
      if (enabled) {
        fireTrackingEvent(name, properties, metadata);
      }
    },
    [getTrackingConfig],
  );
  const value = React.useMemo(() => ({ ...services, trackEvent }), [services, trackEvent]);

  return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
}
```

The host supplies its other core services and a stable configuration getter backed by current host state. This example wires custom events; host lifecycle code must also apply the policy to SDK initialization, page events, and identify operations.

### SDK Initialization

`initSegment` initializes the shared browser client on `window.analytics`. It skips initialization when disabled or given an empty key. It does **not** stop an existing client, and repeated enabled calls load a client again. Hosts must coordinate initialization and configuration changes, gate all event operations on current enablement, and define how disabling tracking handles queued events. Passing `enabled: false` alone is not a runtime opt-out mechanism.

After the host has authorized initialization:

```ts
import { initSegment, computeAnonymousUserId } from '@odh-dashboard/analytics';

await initSegment({ segmentKey: 'write-key', enabled: true });

// Compute an anonymous user ID (SHA-1 hash).
const anonId = await computeAnonymousUserId('username');
```

## Verification

Feature tests inject callback spies through the real host context or directly into pure helpers and assert event names, literal payloads, and counts. Host adapter tests verify metadata, enablement, and forwarding to the implementation. Exercise intentional no-op adapters to ensure application interactions remain functional when tracking is disabled.
