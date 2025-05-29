import React from 'react';
import { BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import PipelineRunDetails from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import { PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { experimentArchivedRunsRoute, experimentRunsRoute } from '#~/routes/pipelines/experiments';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import usePipelineRunById from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { StorageStateKF } from '#~/concepts/pipelines/kfTypes';

const ExperimentPipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { runId } = useParams();
  const fetchedRun = usePipelineRunById(runId, true);
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace } = usePipelinesAPI();
  const [run] = fetchedRun;
  const isRunArchived = run?.storage_state === StorageStateKF.ARCHIVED;
  return (
    <PipelineRunDetails
      breadcrumbPath={[
        ...breadcrumbPath,
        <BreadcrumbItem isActive key="experiment" style={{ maxWidth: 300 }}>
          {experiment ? (
            <Link
              to={
                isRunArchived
                  ? experimentArchivedRunsRoute(namespace, experiment.experiment_id)
                  : experimentRunsRoute(namespace, experiment.experiment_id)
              }
            >
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate content={experiment.display_name} className="truncate-no-min-width" />
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={experimentRunsRoute(namespace, experiment?.experiment_id)}
      fetchedRun={fetchedRun}
    />
  );
};

export default ExperimentPipelineRunDetails;
