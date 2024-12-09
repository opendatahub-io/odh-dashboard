import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '~/pages/projects/screens/projects/NewProjectButton';

const DistributedWorkloadsNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState headingLevel="h4" icon={WrenchIcon} titleText="No data science projects">
      <EmptyStateBody>
        To view distributed workload metrics, first create a data science project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={() => navigate('/distributedWorkloads')}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default DistributedWorkloadsNoProjects;
