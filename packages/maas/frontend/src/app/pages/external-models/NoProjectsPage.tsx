import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import { deploymentsExternalPath } from '~/app/pages/external-models/const';
import NewProjectButton from './NewProjectButton';

const NoProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No projects">
      <EmptyStateBody>To use external models, first create a project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          onProjectCreated={(projectName) => navigate(deploymentsExternalPath(projectName))}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default NoProjectsPage;
