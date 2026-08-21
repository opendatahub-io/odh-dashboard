import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from './NewProjectButton';

const NoProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No projects">
      <EmptyStateBody>To deploy a model, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          onProjectCreated={(projectName) => navigate(`/ai-hub/models/deployments/${projectName}`)}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default NoProjectsPage;
