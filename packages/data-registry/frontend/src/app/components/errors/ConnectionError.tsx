import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateActions,
  EmptyStateFooter,
  Button,
} from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';

type ConnectionErrorProps = {
  onRetry: () => void;
};

const ConnectionError: React.FC<ConnectionErrorProps> = ({ onRetry }) => (
  <EmptyState
    headingLevel="h2"
    titleText="Connection failed"
    variant={EmptyStateVariant.lg}
    icon={DisconnectedIcon}
    status="danger"
  >
    <EmptyStateBody>
      Unable to connect to the Data Registry service. Check your network connection and try again.
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

export default ConnectionError;
