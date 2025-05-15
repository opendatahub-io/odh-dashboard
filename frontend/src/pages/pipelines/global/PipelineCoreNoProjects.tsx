import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '~/pages/projects/screens/projects/NewProjectButton';
import { pipelinesBaseRoute } from '~/routes/pipelines/global';

const PipelineCoreNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No data science projects"
      data-testid="empty-state-title"
    >
      <EmptyStateBody>
        To create a pipeline server and import a pipeline, first create a data science project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(pipelinesBaseRoute(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default PipelineCoreNoProjects;
