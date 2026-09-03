import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';

type AccessDeniedErrorProps = {
  resource: string;
};

const AccessDeniedError: React.FC<AccessDeniedErrorProps> = ({ resource }) => (
  <EmptyState
    headingLevel="h2"
    titleText="Access denied"
    variant={EmptyStateVariant.lg}
    icon={LockIcon}
    status="danger"
  >
    <EmptyStateBody>
      You do not have access to {resource}. Contact your administrator to request permissions.
    </EmptyStateBody>
  </EmptyState>
);

export default AccessDeniedError;
