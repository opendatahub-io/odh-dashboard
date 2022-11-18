import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ModelServingContext } from '../../ModelServingContext';
import ServeModelButton from './ServeModelButton';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  const {
    servingRuntimes: { data: servingRuntimes },
  } = React.useContext(ModelServingContext);

  if (servingRuntimes.length === 0) {
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
  }

  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h4" size="lg">
        No deployed models.
      </Title>
      <EmptyStateBody>To get started, use existing model servers to serve a model.</EmptyStateBody>
      <ServeModelButton />
    </EmptyState>
  );
};

export default EmptyModelServing;
