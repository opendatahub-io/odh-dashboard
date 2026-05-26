import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import apiKeysEmptyStateImg from '@odh-dashboard/internal/images/empty-state-api-keys.svg';

type EmptyApiKeysPageProps = {
  onCreateApiKey: () => void;
};

const EmptyApiKeysPage: React.FC<EmptyApiKeysPageProps> = ({ onCreateApiKey }) => (
  <EmptyState
    data-testid="empty-state-title"
    headingLevel="h3"
    titleText="No API keys"
    variant="sm"
    icon={() => <img src={apiKeysEmptyStateImg} alt="No API keys" />}
  >
    <EmptyStateBody>
      API keys let you authenticate with AI model endpoints. Create a key to start making requests
      to models available in your subscriptions.
    </EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button variant="primary" onClick={onCreateApiKey} data-testid="create-api-key-button">
          Create API key
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyApiKeysPage;
