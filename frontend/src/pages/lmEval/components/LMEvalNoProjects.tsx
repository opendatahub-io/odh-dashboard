import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '#~/pages/projects/screens/projects/NewProjectButton';

const LMEvalNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No projects"
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        To view model evaluations, first create a project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton closeOnCreate onProjectCreated={() => navigate('/modelEvaluations')} />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default LMEvalNoProjects;
