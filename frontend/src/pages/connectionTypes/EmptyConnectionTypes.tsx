import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';

const EmptyConnectionTypes: React.FC = () => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={PlusCircleIcon}
      titleText="No connection types"
      variant={EmptyStateVariant.full}
      data-testid="connection-types-empty-state"
    >
      <EmptyStateBody>To get started create a connection type.</EmptyStateBody>
      <EmptyStateFooter>
        <Button
          data-testid="add-connection-type"
          variant="primary"
          component={(props) => (
            <Link {...props} to="/settings/environment-setup/connection-types/create" />
          )}
        >
          Create connection type
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default EmptyConnectionTypes;
