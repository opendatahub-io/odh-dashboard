import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';

export const StandaloneDevPage: React.FC = () => (
  <EmptyState headingLevel="h4" titleText="Model Serving federated remote">
    <EmptyStateBody>
      This dev server exposes the Module Federation remote entry for model-serving. Load the host
      dashboard with <code>npm run dev</code> to exercise extensions at runtime, or fetch{' '}
      <code>/remoteEntry.js</code> from this port.
    </EmptyStateBody>
    <EmptyStateFooter>
      Federated dev port is configured in <code>module-federation.local.port</code>.
    </EmptyStateFooter>
  </EmptyState>
);
