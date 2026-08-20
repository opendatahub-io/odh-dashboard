import * as React from 'react';
import {
  HostApiCoreContext,
  HostApiInfraContext,
  type HostApiCoreServices,
  type HostApiInfraServices,
} from '@odh-dashboard/plugin-core/host-api';
import { EmptyState, EmptyStateBody, EmptyStateFooter, Title } from '@patternfly/react-core';

const notProvided = (name: string) => () => {
  throw new Error(`Standalone model-serving dev: ${name} is not available`);
};

/**
 * Standalone federated dev host wiring.
 * Follows the split HostApiCore/HostApiInfra pattern from the host-api decoupling proposal:
 * https://gist.github.com/caponetto/e10c98b9ce2d664fd1fe5b94e8570035
 */
export const StandaloneHostApiProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const core = React.useMemo<HostApiCoreServices>(
    () => ({
      dashboardNamespace: 'opendatahub',
      checkAccess: async () => true,
      trackEvent: () => undefined,
      fetchDashboardConfig: notProvided('fetchDashboardConfig'),
    }),
    [],
  );

  const infra = React.useMemo<HostApiInfraServices>(
    () => ({
      createSecret: notProvided('createSecret'),
      getSecret: notProvided('getSecret'),
      deleteSecret: notProvided('deleteSecret'),
      getSecretsByLabel: notProvided('getSecretsByLabel'),
      patchSecretWithOwnerReference: notProvided('patchSecretWithOwnerReference'),
      patchSecretWithProtocolAnnotation: notProvided('patchSecretWithProtocolAnnotation'),
      createProject: notProvided('createProject'),
      getDashboardPvcs: notProvided('getDashboardPvcs'),
    }),
    [],
  );

  return (
    <HostApiCoreContext.Provider value={core}>
      <HostApiInfraContext.Provider value={infra}>{children}</HostApiInfraContext.Provider>
    </HostApiCoreContext.Provider>
  );
};

export const StandaloneDevPage: React.FC = () => (
  <EmptyState>
    <Title headingLevel="h4" size="lg">
      Model Serving federated remote
    </Title>
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
