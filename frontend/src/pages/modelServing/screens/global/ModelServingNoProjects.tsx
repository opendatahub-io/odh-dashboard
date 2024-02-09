import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '~/pages/projects/screens/projects/NewProjectButton';

const ModelServingNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState>
      <EmptyStateHeader
        titleText="No data science projects"
        icon={<EmptyStateIcon icon={WrenchIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>To deploy a model, first create a data science project.</EmptyStateBody>
      <EmptyStateFooter>
        <NewProjectButton
          closeOnCreate
          onProjectCreated={(projectName) => navigate(`/modelServing/${projectName}`)}
        />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default ModelServingNoProjects;
