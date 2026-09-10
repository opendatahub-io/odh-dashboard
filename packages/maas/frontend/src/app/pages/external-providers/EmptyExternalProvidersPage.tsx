import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, EmptyStateBody, Button, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

const EmptyExternalProvidersPage: React.FC = () => (
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
          <Button variant="primary" component={(props) => <Link {...props} to="something" />}>
            Create external provider
          </Button>
        </StackItem>
      </Stack>
    </EmptyStateBody>
  </EmptyState>
);

export default EmptyExternalProvidersPage;
