# @odh-dashboard/analytics

Shared Segment analytics implementation for ODH Dashboard.

## Purpose

Provides the concrete Segment SDK integration (init, fire\* tracking functions, anonymous user ID hashing) used by the main dashboard and distributions. The React contract (`AnalyticsContext` / `useAnalytics()`) lives in `@odh-dashboard/ui-core`; this package supplies the implementation that distributions wire into that context.

## Usage

```ts
import {
  initSegment,
  fireTrackingEvent,
  firePageEvent,
  fireIdentifyEvent,
  computeAnonymousUserId,
} from '@odh-dashboard/analytics';

// Initialize the Segment SDK
await initSegment({ segmentKey: 'write-key', enabled: true });

// Fire a tracking event (parameterized — no globals)
fireTrackingEvent('button_clicked', { buttonId: 'submit' }, {
  clusterID: 'cluster-1',
  devMode: false,
  version: '1.0.0',
});

// Compute an anonymous user ID (SHA-1 hash)
const anonId = await computeAnonymousUserId('username');
```
