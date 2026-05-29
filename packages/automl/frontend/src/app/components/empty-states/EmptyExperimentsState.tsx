import React from 'react';
import { Link } from 'react-router-dom';

import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { Button } from '@patternfly/react-core';

/**
 * Empty State B — pipeline server and managed AutoML pipelines are OK; zero runs.
 * Shown only after successful loads (`!loadError && loaded && totalSize === 0`).
 */
interface EmptyExperimentsStateProps {
  createExperimentRoute: string;
  dataTestId?: string;
}

const EmptyExperimentsState: React.FC<EmptyExperimentsStateProps> = ({
  createExperimentRoute,
  dataTestId = 'empty-experiments-state',
}) => (
  <div data-testid={dataTestId}>
    <EmptyDetailsView
      title="Create an AutoML optimization run"
      description="Test different model configurations to find the best-performing solution for classification, regression, and time series problems."
      iconImage={typedEmptyImage(ProjectObjectType.pipeline, 'MissingModel')}
      imageAlt=""
      createButton={
        <Button
          data-testid="create-run-button"
          variant="primary"
          component={(props) => <Link {...props} to={createExperimentRoute} />}
        >
          Create run
        </Button>
      }
    />
  </div>
);

export default EmptyExperimentsState;
