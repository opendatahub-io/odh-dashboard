import React from 'react';
import { Link } from 'react-router-dom';

import { EmptyDetailsView } from '@odh-dashboard/ui-core';
import { Button } from '@patternfly/react-core';

/**
 * Empty State B — pipeline server and managed pipelines are OK; zero runs.
 * Shown only after successful loads (`!loadError && loaded && totalSize === 0`).
 */
interface EmptyExperimentsStateProps {
  createExperimentRoute: string;
  title: string;
  description: string;
  iconImage: string;
  dataTestId?: string;
}

const EmptyExperimentsState: React.FC<EmptyExperimentsStateProps> = ({
  createExperimentRoute,
  title,
  description,
  iconImage,
  dataTestId = 'empty-experiments-state',
}) => (
  <div data-testid={dataTestId}>
    <EmptyDetailsView
      title={title}
      description={description}
      iconImage={iconImage}
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
