import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton';

type GenAiCoreNoProjectsProps = {
  getRedirectPath: (namespace: string) => string;
};

const GenAiCoreNoProjects: React.FC<GenAiCoreNoProjectsProps> = ({ getRedirectPath }) => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No data science projects"
      data-testid="empty-state-title"
    >
      <EmptyStateBody>To use the playground, first create a data science project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(getRedirectPath(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default GenAiCoreNoProjects;
