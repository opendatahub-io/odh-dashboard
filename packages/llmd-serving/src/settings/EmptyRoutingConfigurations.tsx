import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

const EmptyRoutingConfigurations: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={PlusCircleIcon}
    titleText="No llm-d routing configurations"
    data-testid="empty-routing-configurations"
  >
    <EmptyStateBody>
      Routing configurations define how inference traffic is scheduled and exposed when deploying
      models with advanced routing. Add a configuration to make it available in the model serving
      wizard.
    </EmptyStateBody>
    <EmptyStateFooter>
      <Button
        variant="primary"
        data-testid="add-routing-config-button"
        component={(props: React.ComponentProps<'a'>) => <Link {...props} to="add" />}
      >
        Add llm-d routing configuration
      </Button>
    </EmptyStateFooter>
  </EmptyState>
);

export default EmptyRoutingConfigurations;
