import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateVariant,
  EmptyStateActions,
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
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText="No deployed models yet"
          icon={<EmptyStateIcon icon={WrenchIcon} />}
          headingLevel="h2"
        />
        <EmptyStateBody>
          To get started, deploy a model from the <strong>Models and model servers</strong> section
          of a project.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="link"
              onClick={() => navigate(project ? `/projects/${project.metadata.name}` : '/projects')}
            >
              {project ? `Go to ${getProjectDisplayName(project)}` : 'Select a project'}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  return (
    <EmptyState>
      <EmptyStateHeader
        titleText="No deployed models."
        icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>To get started, deploy a model.</EmptyStateBody>
      <EmptyStateFooter>
        <ServeModelButton />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyModelServing;
