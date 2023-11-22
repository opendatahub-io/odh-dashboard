import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateSecondaryActions,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon, WrenchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectDisplayName } from '~/pages/projects/utils';
import ServeModelButton from './ServeModelButton';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  const {
    servingRuntimes: { data: servingRuntimes },
    project,
  } = React.useContext(ModelServingContext);
  const servingPlatformStatuses = useServingPlatformStatuses();

  if (
    getProjectModelServingPlatform(project, servingPlatformStatuses).platform !==
      ServingRuntimePlatform.SINGLE &&
    servingRuntimes.length === 0
  ) {
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
        <EmptyStateSecondaryActions>
          <Button
            variant="link"
            onClick={() => navigate(project ? `/projects/${project.metadata.name}` : '/projects')}
          >
            {project ? `Go to ${getProjectDisplayName(project)}` : 'Select a project'}
          </Button>
        </EmptyStateSecondaryActions>
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
