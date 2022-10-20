import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  // TODO: Add logic to display either configure a server when there's no one or allow to deploy model
  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h4" size="lg">
        No model servers.
      </Title>
      <EmptyStateBody>
        Before deploying a model, you must first configure a model server.
      </EmptyStateBody>
      <Button variant="primary" onClick={() => navigate('/projects')}>
        Create server
      </Button>
    </EmptyState>
  );
};

export default EmptyModelServing;
