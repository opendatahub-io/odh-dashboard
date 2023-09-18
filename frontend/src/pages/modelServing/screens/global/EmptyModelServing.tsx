import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import ServeModelButton from './ServeModelButton';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  const {
    servingRuntimes: { data: servingRuntimes },
  } = React.useContext(ModelServingContext);

  if (servingRuntimes.length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.small}>
        <EmptyStateIcon icon={WrenchIcon} />
        <Title headingLevel="h2" size="lg">
          No deployed models yet
        </Title>
        <EmptyStateBody>
          To get started, deploy a model from the <strong>Models and model servers</strong> section
          of a project.
        </EmptyStateBody>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Select a project
        </Button>
      </EmptyState>
    );
  }

  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h2" size="lg">
        No deployed models
      </Title>
      <EmptyStateBody>To get started, use existing model servers to serve a model.</EmptyStateBody>
      <ServeModelButton />
    </EmptyState>
  );
};

export default EmptyModelServing;
