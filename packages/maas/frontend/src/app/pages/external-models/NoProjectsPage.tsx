import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';
import { deploymentsExternalPath } from '~/app/pages/external-models/const';

const NoProjectsPage: React.FC = () => (
  <EmptyState
    headingLevel="h4"
    icon={WrenchIcon}
    titleText="No projects"
    data-testid="external-models-no-projects"
  >
    <EmptyStateBody>To use external models, first create a project.</EmptyStateBody>
    <EmptyStateFooter>
      <NewProjectButton
        closeOnCreate
        waitForProjectOnClose={false}
        onProjectCreated={(projectName) => {
          window.location.assign(deploymentsExternalPath(projectName));
        }}
      />
    </EmptyStateFooter>
  </EmptyState>
);

export default NoProjectsPage;
