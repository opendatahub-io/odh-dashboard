import React from 'react';
import { Link } from 'react-router';

import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { Button } from '@patternfly/react-core';

/**
 * Empty State B — pipeline server and managed AutoRAG pipeline are OK; zero runs.
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
      title="Create a RAG optimization run"
      description="Test different retrieval and model configurations to find the best-performing setup."
      iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
      imageAlt=""
      createButton={
        <Button
          data-testid="create-experiment-button"
          variant="primary"
          component={(props) => <Link {...props} to={createExperimentRoute} />}
        >
          Create experiment
        </Button>
      }
    />
  </div>
);

export default EmptyExperimentsState;
