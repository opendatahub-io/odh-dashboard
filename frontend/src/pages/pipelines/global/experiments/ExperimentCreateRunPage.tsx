import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import CreateRunPage from '#~/concepts/pipelines/content/createRun/CreateRunPage';
import { RunTypeOption } from '#~/concepts/pipelines/content/createRun/types';
import { PathProps, PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentRecurringRunsRoute, experimentRunsRoute } from '#~/routes/pipelines/experiments';

const ExperimentCreateRunPageInner: React.FC<PathProps & { runType: RunTypeOption }> = ({
  breadcrumbPath,
  runType,
}) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();

  const redirectLink =
    runType === RunTypeOption.SCHEDULED
      ? experimentRecurringRunsRoute(namespace, experiment?.experiment_id)
      : experimentRunsRoute(namespace, experiment?.experiment_id);
  return (
    <CreateRunPage
      breadcrumbPath={[
        ...breadcrumbPath,
        <BreadcrumbItem isActive key="experiment" style={{ maxWidth: 300 }}>
          {experiment ? (
            <Link to={redirectLink}>
              <Truncate content={experiment.display_name} />
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={redirectLink}
      runType={runType}
      contextExperiment={experiment}
    />
  );
};

export const ExperimentCreateRunPage: PipelineCoreDetailsPageComponent = (props) => (
  <ExperimentCreateRunPageInner runType={RunTypeOption.ONE_TRIGGER} {...props} />
);

export const ExperimentCreateSchedulePage: PipelineCoreDetailsPageComponent = (props) => (
  <ExperimentCreateRunPageInner runType={RunTypeOption.SCHEDULED} {...props} />
);
