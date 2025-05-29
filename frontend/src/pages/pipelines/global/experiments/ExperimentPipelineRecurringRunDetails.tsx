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
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate content={experiment.display_name} className="truncate-no-min-width" />
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
