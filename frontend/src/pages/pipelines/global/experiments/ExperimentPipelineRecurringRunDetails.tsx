import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentRecurringRunsRoute } from '#~/routes/pipelines/experiments';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PipelineRecurringRunDetails from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRecurringRun/PipelineRecurringRunDetails';

const ExperimentPipelineRecurringRunDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
}) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();
  return (
    <PipelineRecurringRunDetails
      breadcrumbPath={[
        ...breadcrumbPath,
        <BreadcrumbItem isActive key="experiment" style={{ maxWidth: 300 }}>
          {experiment ? (
            <Link to={experimentRecurringRunsRoute(namespace, experiment.experiment_id)}>
              <Truncate content={experiment.display_name} />
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={experimentRecurringRunsRoute(namespace, experiment?.experiment_id)}
    />
  );
};

export default ExperimentPipelineRecurringRunDetails;
