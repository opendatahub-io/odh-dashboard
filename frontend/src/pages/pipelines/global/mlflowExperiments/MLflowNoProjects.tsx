import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '#~/pages/projects/screens/projects/NewProjectButton';
import { mlflowExperimentsBaseRoute } from '#~/routes/pipelines/mlflowExperiments';

const MLflowNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No projects"
      data-testid="mlflow-no-projects-empty-state"
    >
      <EmptyStateBody>To view MLflow experiments, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(mlflowExperimentsBaseRoute(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default MLflowNoProjects;
