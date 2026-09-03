import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';

type AccessDeniedErrorProps = {
  resourceName?: string;
};

const AccessDeniedError: React.FC<AccessDeniedErrorProps> = ({
  resourceName = 'this project in Data Registry',
}) => (
  <EmptyState
    headingLevel="h2"
    titleText="Access denied"
    variant={EmptyStateVariant.lg}
    icon={LockIcon}
    status="danger"
  >
    <EmptyStateBody>You do not have access to {resourceName}.</EmptyStateBody>
  </EmptyState>
);

export default AccessDeniedError;
