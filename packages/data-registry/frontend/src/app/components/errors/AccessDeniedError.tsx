import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';

type AccessDeniedErrorProps = {
  resourceName?: string;
  error?: Error;
};

const AccessDeniedError: React.FC<AccessDeniedErrorProps> = ({
  resourceName = 'this project in Data Registry',
  error,
}) => (
  <EmptyState
    headingLevel="h2"
    titleText="Access denied"
    variant={EmptyStateVariant.lg}
    icon={LockIcon}
    status="danger"
  >
    <EmptyStateBody>
      You do not have access to {resourceName}.
      {error ? (
        <>
          <br />
          <br />
          {error.message}
        </>
      ) : null}
    </EmptyStateBody>
  </EmptyState>
);

export default AccessDeniedError;
