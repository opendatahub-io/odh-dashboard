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
import ServeModelButton from './ServeModelButton';

const EmptyModelServing: React.FC = () => {
  const navigate = useNavigate();
  const {
    servingRuntimes: { data: servingRuntimes },
  } = React.useContext(ModelServingContext);

  if (servingRuntimes.length === 0) {
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
        <EmptyStateActions>
          <Button variant="link" onClick={() => navigate('/projects')}>
            Select a project
          </Button>
        </EmptyStateActions>
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
      <EmptyStateBody>To get started, use existing model servers to serve a model.</EmptyStateBody>
      <EmptyStateFooter>
        <ServeModelButton />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyModelServing;
