import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateActions,
  EmptyStateFooter,
  Button,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

type ServiceUnavailableErrorProps = {
  onRetry: () => void;
};

const ServiceUnavailableError: React.FC<ServiceUnavailableErrorProps> = ({ onRetry }) => (
  <EmptyState
    headingLevel="h2"
    titleText="Data Registry service is temporarily unavailable"
    variant={EmptyStateVariant.lg}
    icon={ExclamationTriangleIcon}
    status="warning"
  >
    <EmptyStateBody>
      The Data Registry service is not responding. This may be temporary while the service is
      starting up or being updated.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button variant="primary" onClick={onRetry} data-testid="retry-button">
          Retry
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default ServiceUnavailableError;
