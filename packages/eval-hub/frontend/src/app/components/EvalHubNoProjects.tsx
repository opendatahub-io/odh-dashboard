import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const EvalHubNoProjects: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={CubesIcon}
    titleText="No projects"
    variant={EmptyStateVariant.lg}
    data-testid="eval-hub-no-projects"
  >
    <EmptyStateBody>To get started, create a project.</EmptyStateBody>
  </EmptyState>
);

export default EvalHubNoProjects;
