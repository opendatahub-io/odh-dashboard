import React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import PipelineRunDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetails';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { pipelineVersionArchivedRunsRoute, pipelineVersionRunsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineVersionContext } from '~/pages/pipelines/global/pipelines/PipelineVersionContext';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';
import PipelineVersionDetailsBreadcrumb from './PipelineVersionDetailsBreadcrumb';

const PipelineVersionRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { runId } = useParams();
  const fetchedRun = usePipelineRunById(runId, true);
  const { version } = React.useContext(PipelineVersionContext);
  const { namespace } = usePipelinesAPI();
  const [run] = fetchedRun;
  const isRunArchived = run?.storage_state === StorageStateKF.ARCHIVED;
  return (
    <PipelineRunDetails
      breadcrumbPath={[
        ...breadcrumbPath,
        <PipelineVersionDetailsBreadcrumb key="pipeline-version-details" />,
        <BreadcrumbItem isActive key="pipeline-version-runs">
          {version ? (
            <Link
              to={
                isRunArchived
                  ? pipelineVersionArchivedRunsRoute(
                      namespace,
                      version.pipeline_id,
                      version.pipeline_version_id,
                    )
                  : pipelineVersionRunsRoute(
                      namespace,
                      version.pipeline_id,
                      version.pipeline_version_id,
                    )
              }
            >
              Runs
            </Link>
          ) : (
            'Loading...'
          )}
        </BreadcrumbItem>,
      ]}
      contextPath={pipelineVersionRunsRoute(
        namespace,
        version?.pipeline_id,
        version?.pipeline_version_id,
      )}
      fetchedRun={fetchedRun}
    />
  );
};

export default PipelineVersionRunDetails;
