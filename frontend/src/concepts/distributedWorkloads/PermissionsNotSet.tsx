import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator.tsx';

const PermissionsNotSet: React.FC = () => (
  <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="Request Distributed Workloads access">
    <EmptyStateBody>
      To monitor your distributed workload metrics, request that your administrator grant you access
      to this page.
    </EmptyStateBody>
    <EmptyStateFooter>
      <WhosMyAdministrator />
    </EmptyStateFooter>
  </EmptyState>
);

export default PermissionsNotSet;
