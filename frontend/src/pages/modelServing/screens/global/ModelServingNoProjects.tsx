import * as React from 'react';
import { Title, EmptyState, EmptyStateIcon, EmptyStateBody } from '@patternfly/react-core';
import WrenchIcon from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import NewProjectButton from '~/pages/projects/screens/projects/NewProjectButton';

const ModelServingNoProjects: React.FC = () => {
  const navigate = useNavigate();

  return (
    <EmptyState>
      <EmptyStateIcon icon={WrenchIcon} />
      <Title headingLevel="h4" size="lg">
        No data science projects
      </Title>
      <EmptyStateBody>To deploy a model, first create a data science project.</EmptyStateBody>
      <NewProjectButton
        closeOnCreate
        onProjectCreated={(projectName) => navigate(`/modelServing/${projectName}`)}
      />
    </EmptyState>
  );
};

export default ModelServingNoProjects;
