import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- Host NewProjectButton shared across federated empty states
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';
import { BASE_PATH } from '../utils/dashboardUtils';

const ObservabilityNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No projects"
      data-testid="observability-no-projects"
    >
      <EmptyStateBody>To view dashboards and metrics, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton closeOnCreate onProjectCreated={() => navigate(BASE_PATH)} />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default ObservabilityNoProjects;
