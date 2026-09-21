import React from 'react';
import { EmptyState, EmptyStateBody, Button, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

type EmptyExternalProvidersPageProps = {
  onCreateExternalProvider: () => void;
};

const EmptyExternalProvidersPage: React.FC<EmptyExternalProvidersPageProps> = ({
  onCreateExternalProvider,
}) => (
  <EmptyState
    titleText="No external providers"
    headingLevel="h3"
    variant="lg"
    data-testid="empty-external-providers-page"
    icon={PlusCircleIcon}
  >
    <EmptyStateBody>
      <Stack hasGutter>
        <StackItem>
          External providers define the off-cluster endpoints that external models connect to
          through the MaaS gateway.
          <br />
          <br />
          Create a new external provider to get started.
        </StackItem>
        <StackItem>
          <Button
            variant="primary"
            data-testid="create-external-provider-button"
            onClick={onCreateExternalProvider}
          >
            Create external provider
          </Button>
        </StackItem>
      </Stack>
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalProvidersPage;
