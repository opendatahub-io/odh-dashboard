import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PathProps } from '#~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentRunsRoute } from '#~/routes/pipelines/experiments';
import { runDetailsRoute } from '#~/routes/pipelines/runs';
import DuplicateRunPage from '#~/concepts/pipelines/content/createRun/DuplicateRunPage';

const ExperimentDuplicateRunPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();

  return (
    <DuplicateRunPage
      breadcrumbPath={[
        ...breadcrumbPath,
        <BreadcrumbItem isActive key="experiment" style={{ maxWidth: 300 }}>
          {experiment ? (
            <Link to={experimentRunsRoute(namespace, experiment.experiment_id)}>
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate content={experiment.display_name} className="truncate-no-min-width" />
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={experimentRunsRoute(namespace, experiment?.experiment_id)}
      contextExperiment={experiment}
      detailsRedirect={(runId) => runDetailsRoute(namespace, runId, experiment?.experiment_id)}
    />
  );
};

export default ExperimentDuplicateRunPage;
