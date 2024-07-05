import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PathProps } from '~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentContext } from '~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentRunDetailsRoute, experimentRunsRoute } from '~/routes';
import CloneRunPage from '~/concepts/pipelines/content/createRun/CloneRunPage';

const ExperimentCloneRunPage: React.FC<PathProps> = ({ breadcrumbPath }) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();

  return (
    <CloneRunPage
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
      detailsRedirect={(runId) =>
        experimentRunDetailsRoute(namespace, experiment?.experiment_id, runId)
      }
    />
  );
};

export default ExperimentCloneRunPage;
